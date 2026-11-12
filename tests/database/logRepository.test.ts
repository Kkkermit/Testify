import { describeWithMongo } from "../helpers/mongo";
import {
	appendLogLines,
	beginLogRun,
	clearLogLines,
	deleteLogRun,
	findLogRun,
	forgetInLogs,
	type LineInput,
	listLogRuns,
	readLogLines,
} from "@database/repositories/logRepository";
import { LOG_LIMITS } from "@testify/shared";

const RUNS = Array.from({ length: 8 }, (_, index) => `00000000-0000-4000-8000-00000000000${String(index)}`);

function line(seq: number, overrides: Partial<LineInput> = {}): LineInput {
	return {
		seq,
		at: new Date(seq * 1_000),
		level: "info",
		rank: 30,
		message: `line ${String(seq)}`,
		context: "{}",
		...overrides,
	};
}

async function begin(index: number): Promise<string> {
	const run = RUNS[index] ?? "";
	await beginLogRun({ run, startedAt: new Date(Date.UTC(2026, 10, 1 + index)), version: "2.4.1" });
	return run;
}

describeWithMongo("logRepository", () => {
	/** Six runs are kept, this one among them, so the seventh start deletes the oldest and its lines with it. */
	it("keeps the six newest runs, and deletes the oldest's lines when a seventh starts", async () => {
		for (const index of [0, 1, 2, 3, 4, 5]) await appendLogLines(await begin(index), [line(1)]);
		await begin(6);

		const kept = (await listLogRuns()).map((run) => run.run);

		expect(kept).toEqual([RUNS[6], RUNS[5], RUNS[4], RUNS[3], RUNS[2], RUNS[1]]);
		expect(kept).toHaveLength(LOG_LIMITS.runsKept);
		expect((await readLogLines(RUNS[0] ?? "", { limit: 10, minRank: 0 })).held).toBe(0);
	});

	/** A batch sent again after a failed write must not appear twice. */
	it("keeps a line sent twice once", async () => {
		const run = await begin(0);

		await appendLogLines(run, [line(1), line(2)]);
		await appendLogLines(run, [line(2), line(3)]);

		expect((await readLogLines(run, { limit: 10, minRank: 0 })).lines.map((entry) => entry.seq)).toEqual([3, 2, 1]);
	});

	it("drops a run's oldest lines past the number each run keeps", async () => {
		const run = await begin(0);

		await appendLogLines(run, [line(1), line(2)]);
		await appendLogLines(run, [line(LOG_LIMITS.linesPerRun + 2)]);

		const { lines } = await readLogLines(run, { limit: 10, minRank: 0 });
		expect(lines.map((entry) => entry.seq)).toEqual([LOG_LIMITS.linesPerRun + 2]);
		expect((await findLogRun(run))?.lastAt).toEqual(new Date((LOG_LIMITS.linesPerRun + 2) * 1_000));
	});

	/** A search is read as written, so `(` or `.*` finds those characters rather than breaking or matching everything. */
	it("filters by level and searches the message and the context as written", async () => {
		const run = await begin(0);
		await appendLogLines(run, [
			line(1, {
				level: "error",
				rank: 50,
				message: "[COMMAND_ERROR] A command failed.",
				context: '{"user":"927917673344557108"}',
			}),
			line(2, { level: "info", rank: 30, message: "[READY] Online (2 shards)" }),
			line(3, { level: "warn", rank: 40, message: "[LOGS] Slow" }),
		]);

		const errors = await readLogLines(run, { limit: 10, minRank: 50 });
		const byUser = await readLogLines(run, { limit: 10, minRank: 0, search: "927917673344557108" });
		const literal = await readLogLines(run, { limit: 10, minRank: 0, search: "(2 shards)" });
		const pattern = await readLogLines(run, { limit: 10, minRank: 0, search: ".*" });

		expect(errors.lines.map((entry) => entry.seq)).toEqual([1]);
		expect(byUser.lines.map((entry) => entry.seq)).toEqual([1]);
		expect(literal.lines.map((entry) => entry.seq)).toEqual([2]);
		expect(pattern.matched).toBe(0);
		expect(errors.held).toBe(3);
	});

	it("counts each run's lines, errors and warnings", async () => {
		const run = await begin(0);
		await appendLogLines(run, [
			line(1, { level: "error", rank: 50 }),
			line(2, { level: "fatal", rank: 60 }),
			line(3, { level: "warn", rank: 40 }),
			line(4),
		]);

		expect(await listLogRuns()).toEqual([
			expect.objectContaining({ run, lines: 4, errors: 2, warnings: 1, matched: null }),
		]);
		// Lines 1 to 4 are all "line n", so the search finds them all and the level leaves the two that failed.
		expect((await listLogRuns({ minRank: 50, text: "LINE" }))[0]?.matched).toBe(2);
	});

	it("deletes a past run whole, and empties a run that is still going", async () => {
		const past = await begin(0);
		const going = await begin(1);
		await appendLogLines(past, [line(1)]);
		await appendLogLines(going, [line(1)]);

		expect(await deleteLogRun(past)).toBe(true);
		expect(await deleteLogRun(past)).toBe(false);
		await clearLogLines(going);

		expect(await findLogRun(past)).toBeNull();
		expect(await findLogRun(going)).not.toBeNull();
		expect((await readLogLines(going, { limit: 10, minRank: 0 })).held).toBe(0);
	});

	/** Delete my data reaches every run kept, not only the one in memory. */
	it("forgets every line that mentions an id, in every run", async () => {
		const first = await begin(0);
		const second = await begin(1);
		await appendLogLines(first, [line(1, { context: '{"user":"927917673344557108"}' }), line(2)]);
		await appendLogLines(second, [line(1, { message: "927917673344557108 ran /clear" })]);

		await forgetInLogs("927917673344557108");

		expect((await readLogLines(first, { limit: 10, minRank: 0 })).lines.map((entry) => entry.seq)).toEqual([2]);
		expect((await readLogLines(second, { limit: 10, minRank: 0 })).held).toBe(0);
	});
});
