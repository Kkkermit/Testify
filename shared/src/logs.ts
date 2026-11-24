import { z } from "zod";

/** The owner console's Logs tab: the levels, the runs kept and the lines read back. */

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export type ReportedLogLevel = (typeof LOG_LEVELS)[number];

export const LOG_LEVEL_RANK: Record<ReportedLogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

const MAX_LOG_SEARCH = 100;

export const LOG_LIMITS = {
	/** Runs kept, this one included, so the seventh start deletes the oldest. */
	runsKept: 6,
	/** Lines kept for each run, at every level, the oldest going first. */
	linesPerRun: 2_000,
} as const;

/** A run is named by the id it was given when the process started. */
const runId = z.uuid();

export const logQuery = z.object({
	limit: z.coerce.number().int().min(1).max(1_000).default(200),
	level: z.enum(LOG_LEVELS).default("trace"),
	/** Free text matched against the message and the context, so a guild id finds every line about it. */
	q: z.string().trim().max(MAX_LOG_SEARCH).optional(),
	/** Absent for the run the bot is in now. */
	run: runId.optional(),
});

export const logRunParams = z.object({ runId });

/** The list of runs counts the lines each holds that this level and search would show. */
export const logRunsQuery = logQuery.pick({ level: true, q: true });

export interface LogRun {
	id: string;
	startedAt: string;
	/** When it shut down; null while it runs, and for a run that stopped without shutting down. */
	endedAt: string | null;
	/** Its newest line, which is the nearest thing to an end for a run that stopped without one. */
	lastAt: string | null;
	version: string;
	current: boolean;
	/** How many of its lines the search shows at the level chosen; null without a search. */
	matched: number | null;
	lines: number;
	errors: number;
	warnings: number;
}

export interface LogRuns {
	runs: LogRun[];
	kept: number;
	/** The database could not be read, so only the run in memory is listed. */
	pastUnavailable: boolean;
}

export interface LogLine {
	at: string;
	level: string;
	message: string;
	/** Structured context, with anything that looked like a secret already removed by the bot. */
	context: Record<string, unknown>;
}

export interface LogFeed {
	/** The run these lines come from. */
	run: string;
	current: boolean;
	lines: LogLine[];
	buffered: number;
	capacity: number;
	loggerLevel: ReportedLogLevel;
	matched: number;
}
