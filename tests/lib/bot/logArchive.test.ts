import { createMockClient } from "../../helpers/mocks";
import { type Logger } from "@core/logger";
import { LogRing } from "@core/logRing";
import { appendLogLines, beginLogRun, endLogRun } from "@database/repositories/logRepository";
import { LogArchive } from "@lib/bot/logArchive.util";

jest.mock("@database/repositories/logRepository", () => ({
	appendLogLines: jest.fn(() => Promise.resolve()),
	beginLogRun: jest.fn(() => Promise.resolve()),
	endLogRun: jest.fn(() => Promise.resolve()),
}));

const append = jest.mocked(appendLogLines);
const begin = jest.mocked(beginLogRun);

async function started(ring: LogRing): Promise<{ archive: LogArchive; client: ReturnType<typeof createMockClient> }> {
	const client = createMockClient();
	const archive = new LogArchive(ring);
	await archive.start(client);
	return { archive, client };
}

describe("the log archive", () => {
	/** Lines logged before the database answered are the ones that say why a start went wrong. */
	it("writes what was logged before it started, with its level as a number and its context as JSON", async () => {
		const ring = new LogRing(10);
		ring.push({ at: 0, level: "warn", message: "[DATABASE] Slow", context: { ms: 900 } });
		const { archive, client } = await started(ring);

		await archive.flush(client.logger);

		expect(begin).toHaveBeenCalledWith(expect.objectContaining({ run: ring.run.id }));
		expect(append).toHaveBeenCalledWith(ring.run.id, [
			expect.objectContaining({ seq: 1, rank: 40, message: "[DATABASE] Slow", context: '{"ms":900}' }),
		]);
		expect(client.timers.every).toHaveBeenCalledWith("log-archive", 5_000, expect.any(Function));
	});

	/** A refused batch is kept for the next try, and the warning is said once rather than every five seconds. */
	it("keeps what the database refused, and warns once per outage", async () => {
		const ring = new LogRing(10);
		const { archive } = await started(ring);
		const logger = { warn: jest.fn(), info: jest.fn() } as unknown as Logger;
		append.mockRejectedValue(new Error("not primary"));

		ring.push({ at: 0, level: "info", message: "first", context: {} });
		await archive.flush(logger);
		await archive.flush(logger);
		append.mockResolvedValue();
		await archive.flush(logger);

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(append.mock.lastCall?.[1].map((line) => line.message)).toEqual(["first"]);
		expect(logger.info).toHaveBeenCalledWith("[LOGS] The database is taking log lines again.");
	});

	/** A history that could not be started costs the history, never the bot. */
	it("keeps the lines in memory only when the run could not be recorded", async () => {
		begin.mockRejectedValueOnce(new Error("down"));
		const ring = new LogRing(10);
		const { archive, client } = await started(ring);

		ring.push({ at: 0, level: "info", message: "kept here", context: {} });
		await archive.close(client.logger);

		expect(client.timers.every).not.toHaveBeenCalled();
		expect(append).not.toHaveBeenCalled();
		expect(endLogRun).not.toHaveBeenCalled();
		expect(ring.recent().lines).toHaveLength(1);
	});

	it("writes the last lines and the end of the run when the bot shuts down", async () => {
		const ring = new LogRing(10);
		const { archive, client } = await started(ring);

		ring.push({ at: 0, level: "info", message: "[SHUTDOWN] Shutting down.", context: {} });
		await archive.close(client.logger);

		expect(append).toHaveBeenCalledTimes(1);
		expect(endLogRun).toHaveBeenCalledWith(ring.run.id, expect.any(Date));
	});
});
