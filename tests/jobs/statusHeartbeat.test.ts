import { type TestifyClient } from "@core/client";
import { recordStatusSample } from "@database/repositories/statusRepository";
import { recordHeartbeat } from "@jobs/statusHeartbeat.util";
import { liveStatus, resetEventLoopDelay } from "@lib/bot";

jest.mock("@database/repositories/statusRepository", () => ({ recordStatusSample: jest.fn() }));
jest.mock("@lib/bot", () => ({ liveStatus: jest.fn(), resetEventLoopDelay: jest.fn() }));
jest.mock("@lib/music", () => ({ musicBinaries: jest.fn(() => ({ ytDlp: null, ffmpeg: null })) }));

const CLIENT = {} as TestifyClient;

function status(database: "operational" | "down") {
	return {
		level: database === "down" ? "down" : "operational",
		checkedAt: "2026-09-23T12:00:00.000Z",
		gateway: { pingMs: 40 },
		database: { level: database, pingMs: database === "down" ? null : 5 },
		eventLoop: { p99Ms: 12 },
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("recordHeartbeat", () => {
	it("writes what the bot looked like at that moment", async () => {
		jest.mocked(liveStatus).mockResolvedValueOnce(status("operational") as never);

		await recordHeartbeat(CLIENT);

		expect(recordStatusSample).toHaveBeenCalledWith({
			at: new Date("2026-09-23T12:00:00.000Z"),
			level: "operational",
			gatewayPingMs: 40,
			databasePingMs: 5,
			eventLoopP99Ms: 12,
		});
	});

	/** Each heartbeat reports the event loop over its own five minutes, not since the bot started. */
	it("starts a fresh event-loop window after reading it", async () => {
		jest.mocked(liveStatus).mockResolvedValueOnce(status("operational") as never);

		await recordHeartbeat(CLIENT);

		expect(resetEventLoopDelay).toHaveBeenCalledTimes(1);
	});

	it("does not try to write to a database that is down", async () => {
		jest.mocked(liveStatus).mockResolvedValueOnce(status("down") as never);

		await recordHeartbeat(CLIENT);

		expect(recordStatusSample).not.toHaveBeenCalled();
	});
});
