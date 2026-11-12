import { randomUUID } from "node:crypto";
import { type LogLevel } from "@core/logger";
import { LOG_LIMITS } from "@testify/shared";

/** This run's log lines in memory for the owner console, and the ones the database has not been handed yet. */

export interface LogRecord {
	/** Counts up from 1 within a run, so the database can tell a new line from one it already holds. */
	seq: number;
	at: number;
	level: LogLevel;
	message: string;
	/** Whatever structured context the call site passed, with anything sensitive removed. */
	context: Record<string, unknown>;
}

export type LogInput = Omit<LogRecord, "seq">;

export const LOG_RANK: Record<LogLevel, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

/** Matched against the message and against the stringified context, so a guild id finds every line about it. */
export function lineMentions(record: Pick<LogRecord, "message" | "context">, needle: string): boolean {
	if (record.message.toLowerCase().includes(needle)) return true;

	return JSON.stringify(record.context).toLowerCase().includes(needle);
}

/**
 * Context keys whose values are redacted before a line is kept, so a careless log call cannot put a secret on a web
 * page.
 */
const SECRET_KEY = /token|secret|password|passwd|credential|authorization|cookie|session|uri|url|dsn|key$/i;

const REDACTED = "[redacted]";

/** Deep enough for a Discord error's field-by-field reasons; cycles are real, so the walk stops here. */
const MAX_DEPTH = 8;
const MAX_KEYS = 50;
const MAX_TEXT = 8_000;

/** What a failed request was sending, which can be words somebody wrote, never belongs in a log. */
const LEFT_OUT_OF_ERRORS = new Set(["requestBody"]);

function clipped(text: string): string {
	return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function entriesOf(value: object, depth: number, skip: (key: string) => boolean): [string, unknown][] {
	const entries = Object.entries(value).filter(([key]) => !skip(key));
	const shown: [string, unknown][] = entries
		.slice(0, MAX_KEYS)
		.map(([key, item]) => [key, SECRET_KEY.test(key) ? REDACTED : redact(item, depth + 1)]);

	if (entries.length > MAX_KEYS) shown.push(["…", `${String(entries.length - MAX_KEYS)} more`]);
	return shown;
}

/** An error's name, message and whole stack, every field it carries, and what caused it. */
function errorDetail(error: Error, depth: number): Record<string, unknown> {
	const detail: Record<string, unknown> = {
		name: error.name,
		message: clipped(error.message),
		stack: error.stack === undefined ? null : clipped(error.stack),
	};

	for (const [key, item] of entriesOf(error, depth, (key) => key in detail || LEFT_OUT_OF_ERRORS.has(key))) {
		detail[key] = item;
	}
	if (error.cause !== undefined) detail.cause = redact(error.cause, depth + 1);

	return detail;
}

export function redact(value: unknown, depth = 0): unknown {
	if (typeof value === "string") return clipped(value);
	if (typeof value === "bigint") return value.toString();
	if (value === null || typeof value !== "object") return value;
	if (depth >= MAX_DEPTH) return "[…]";
	if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
	if (value instanceof Error) return errorDetail(value, depth);

	return Object.fromEntries(entriesOf(value, depth, () => false));
}

export class LogRing {
	/** Named once per process, so each start is a run of its own in the history. */
	readonly run = { id: randomUUID(), startedAt: Date.now() };

	private readonly records: LogRecord[] = [];
	private unsent: LogRecord[] = [];
	private seq = 0;

	constructor(private readonly capacity: number = LOG_LIMITS.linesPerRun) {}

	push(input: LogInput): void {
		this.seq += 1;
		const record = { ...input, seq: this.seq, context: redact(input.context) as Record<string, unknown> };

		this.records.push(record);
		this.unsent.push(record);
		// Bounded from the front, so neither list can grow however long the process runs or the database is away.
		if (this.records.length > this.capacity) this.records.splice(0, this.records.length - this.capacity);
		if (this.unsent.length > this.capacity) this.unsent.splice(0, this.unsent.length - this.capacity);
	}

	/** Newest first; `matched` is counted before `limit` cuts the list. */
	recent({ limit = 200, minLevel = "trace", search }: { limit?: number; minLevel?: LogLevel; search?: string } = {}): {
		lines: LogRecord[];
		matched: number;
	} {
		const floor = LOG_RANK[minLevel];
		const needle = search?.trim().toLowerCase() ?? "";

		const found = this.records.filter(
			(record) => LOG_RANK[record.level] >= floor && (needle === "" || lineMentions(record, needle)),
		);

		return { lines: found.slice(-limit).reverse(), matched: found.length };
	}

	/** Hands over every line the database has not had yet. */
	takeUnsent(): LogRecord[] {
		const taken = this.unsent;
		this.unsent = [];
		return taken;
	}

	/** Puts back lines the database refused, ahead of anything logged since, within the same bound. */
	putBack(records: LogRecord[]): void {
		this.unsent = [...records, ...this.unsent].slice(-this.capacity);
	}

	/** Drops every line that mentions `needle`, here and among those not yet written. */
	forget(needle: string): void {
		const lower = needle.toLowerCase();
		const kept = this.records.filter((record) => !lineMentions(record, lower));
		this.records.splice(0, this.records.length, ...kept);
		this.unsent = this.unsent.filter((record) => !lineMentions(record, lower));
	}

	/** How many lines it holds went wrong, and when the newest was written. */
	tally(): { errors: number; warnings: number; lastAt: number | null } {
		let errors = 0;
		let warnings = 0;
		for (const record of this.records) {
			if (LOG_RANK[record.level] >= LOG_RANK.error) errors += 1;
			else if (record.level === "warn") warnings += 1;
		}

		return { errors, warnings, lastAt: this.records.at(-1)?.at ?? null };
	}

	get size(): number {
		return this.records.length;
	}

	clear(): void {
		this.records.length = 0;
		this.unsent = [];
	}
}

/** One buffer for the process, because the logger that feeds it is also one per process. */
export const logRing = new LogRing();
