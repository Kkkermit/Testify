import { type FilterQuery } from "mongoose";
import { type LogLineRecord, LogLines, type LogRunRecord, LogRuns } from "@database/models/logHistory.schema";
import { LOG_LIMITS } from "@testify/shared";

export type LineInput = Omit<LogLineRecord, "run">;

export interface RunSummary extends LogRunRecord {
	lines: number;
	errors: number;
	warnings: number;
	/** Lines at or above `minRank` that mention the search; null without a search. */
	matched: number | null;
}

export interface LineSearch {
	minRank: number;
	text: string;
}

export interface StoredLines {
	lines: LineInput[];
	matched: number;
	held: number;
}

const ERROR_RANK = 50;
const WARN_RANK = 40;

/** Matched as written, so a search is never read as a pattern. */
function literally(text: string): RegExp {
	return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function mentioning(text: string): FilterQuery<LogLineRecord> {
	const pattern = literally(text);
	return { $or: [{ message: pattern }, { context: pattern }] };
}

/** Records this run and deletes the oldest, so the history holds `runsKept` runs with this one among them. */
export async function beginLogRun(run: Pick<LogRunRecord, "run" | "startedAt" | "version">): Promise<void> {
	await LogRuns.updateOne(
		{ run: run.run },
		{ $setOnInsert: { ...run, endedAt: null, lastAt: null } },
		{ upsert: true },
	).exec();

	const stale = await LogRuns.find({}, { _id: 0, run: 1 })
		.sort({ startedAt: -1 })
		.skip(LOG_LIMITS.runsKept)
		.lean<{ run: string }[]>()
		.exec();
	if (stale.length === 0) return;

	const runs = stale.map((entry) => entry.run);
	await Promise.all([
		LogRuns.deleteMany({ run: { $in: runs } }).exec(),
		LogLines.deleteMany({ run: { $in: runs } }).exec(),
	]);
}

/** Written by sequence number, so lines sent twice after a failed write are still kept once. */
export async function appendLogLines(run: string, lines: LineInput[]): Promise<void> {
	const newest = lines.at(-1);
	if (newest === undefined) return;

	await LogLines.bulkWrite(
		lines.map((line) => ({
			updateOne: { filter: { run, seq: line.seq }, update: { $setOnInsert: { ...line, run } }, upsert: true },
		})),
		{ ordered: false },
	);
	await Promise.all([
		LogRuns.updateOne({ run }, { $max: { lastAt: newest.at } }).exec(),
		LogLines.deleteMany({ run, seq: { $lte: newest.seq - LOG_LIMITS.linesPerRun } }).exec(),
	]);
}

export async function endLogRun(run: string, at: Date): Promise<void> {
	await LogRuns.updateOne({ run }, { $set: { endedAt: at } }).exec();
}

export async function findLogRun(run: string): Promise<LogRunRecord | null> {
	return LogRuns.findOne({ run }, { _id: 0 }).lean<LogRunRecord>().exec();
}

/** Newest first, with how many lines each holds, how many went wrong and, given a search, how many it finds. */
export async function listLogRuns(search?: LineSearch): Promise<RunSummary[]> {
	const runs = await LogRuns.find({}, { _id: 0 })
		.sort({ startedAt: -1 })
		.limit(LOG_LIMITS.runsKept)
		.lean<LogRunRecord[]>()
		.exec();

	const pattern = search === undefined ? null : literally(search.text);
	const finds =
		pattern === null || search === undefined
			? 0
			: {
					$and: [
						{ $gte: ["$rank", search.minRank] },
						{
							$or: [
								{ $regexMatch: { input: "$message", regex: pattern } },
								{ $regexMatch: { input: "$context", regex: pattern } },
							],
						},
					],
				};

	const tallies = await LogLines.aggregate<{
		_id: string;
		lines: number;
		errors: number;
		warnings: number;
		matched: number;
	}>([
		{ $match: { run: { $in: runs.map((entry) => entry.run) } } },
		{
			$group: {
				_id: "$run",
				lines: { $sum: 1 },
				errors: { $sum: { $cond: [{ $gte: ["$rank", ERROR_RANK] }, 1, 0] } },
				warnings: { $sum: { $cond: [{ $eq: ["$rank", WARN_RANK] }, 1, 0] } },
				matched: { $sum: { $cond: [finds, 1, 0] } },
			},
		},
	]).exec();
	const byRun = new Map(tallies.map((tally) => [tally._id, tally]));

	return runs.map((entry) => {
		const tally = byRun.get(entry.run);
		return {
			...entry,
			lines: tally?.lines ?? 0,
			errors: tally?.errors ?? 0,
			warnings: tally?.warnings ?? 0,
			matched: search === undefined ? null : (tally?.matched ?? 0),
		};
	});
}

/** Newest first; `matched` is counted before `limit` cuts the list, and `held` is every line the run still has. */
export async function readLogLines(
	run: string,
	{ limit, minRank, search }: { limit: number; minRank: number; search?: string },
): Promise<StoredLines> {
	const filter: FilterQuery<LogLineRecord> = {
		run,
		rank: { $gte: minRank },
		...(search === undefined || search === "" ? {} : mentioning(search)),
	};

	const [lines, matched, held] = await Promise.all([
		LogLines.find(filter, { _id: 0, run: 0 }).sort({ seq: -1 }).limit(limit).lean<LineInput[]>().exec(),
		LogLines.countDocuments(filter).exec(),
		LogLines.countDocuments({ run }).exec(),
	]);

	return { lines, matched, held };
}

/** Returns whether there was such a run to delete. */
export async function deleteLogRun(run: string): Promise<boolean> {
	const [removed] = await Promise.all([LogRuns.deleteOne({ run }).exec(), LogLines.deleteMany({ run }).exec()]);
	return removed.deletedCount > 0;
}

/** Empties a run that is still going, which keeps its place in the history. */
export async function clearLogLines(run: string): Promise<void> {
	await LogLines.deleteMany({ run }).exec();
}

/** Deletes every stored line that mentions `text`, in every run. */
export async function forgetInLogs(text: string): Promise<void> {
	await LogLines.deleteMany(mentioning(text)).exec();
}
