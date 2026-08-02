import { ANALYTICS } from "@config/constants";
import { type LogLevel } from "@core/logger";

/**
 * The last few hundred log lines, kept in memory so the owner console can answer "what broke" without anybody
 * SSH-ing into the host to read a file.
 *
 * In memory and nowhere else, deliberately: a restart clears it, which is the right trade for a buffer that
 * would otherwise need a collection, a retention policy and a way to stop it filling a disk.
 */

export interface LogRecord {
	at: number;
	level: LogLevel;
	message: string;
	/** Whatever structured context the call site passed, with anything sensitive removed. */
	context: Record<string, unknown>;
}

const ORDER: Record<LogLevel, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

/** Matched against the message and against the stringified context, so a guild id finds every line about it. */
function matches(record: LogRecord, needle: string): boolean {
	if (record.message.toLowerCase().includes(needle)) return true;

	return JSON.stringify(record.context).toLowerCase().includes(needle);
}

/**
 * Keys whose values never leave the process. A dashboard page is a much easier thing to read over someone's
 * shoulder than a terminal, and one careless `logger.error({ uri }, …)` would otherwise put a database password
 * on a web page.
 */
const SECRET_KEY = /token|secret|password|passwd|credential|authorization|cookie|session|uri|url|dsn|key$/i;

const REDACTED = "[redacted]";

/** How deep a context object is walked before it is summarised — logs are shallow, and cycles are real. */
const MAX_DEPTH = 3;

export function redact(value: unknown, depth = 0): unknown {
	if (value === null || typeof value !== "object") return value;
	if (depth >= MAX_DEPTH) return "[…]";
	if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));

	if (value instanceof Error) {
		return { name: value.name, message: value.message, stack: value.stack };
	}

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([key, item]) => [
			key,
			SECRET_KEY.test(key) ? REDACTED : redact(item, depth + 1),
		]),
	);
}

export class LogRing {
	private readonly records: LogRecord[] = [];

	constructor(private readonly capacity: number = ANALYTICS.logRingCapacity) {}

	push(record: LogRecord): void {
		this.records.push({ ...record, context: redact(record.context) as Record<string, unknown> });
		// Bounded from the front, so the buffer cannot grow however long the process runs.
		if (this.records.length > this.capacity) this.records.splice(0, this.records.length - this.capacity);
	}

	/**
	 * Newest first, which is the order anybody reads a log in when they are looking for what just broke.
	 *
	 * `matched` is counted before `limit` cuts the list, so the console can say "showing 200 of 640" rather than
	 * letting somebody believe the search found exactly what fits on screen.
	 */
	recent({ limit = 200, minLevel = "trace", search }: { limit?: number; minLevel?: LogLevel; search?: string } = {}): {
		lines: LogRecord[];
		matched: number;
	} {
		const floor = ORDER[minLevel];
		const needle = search?.trim().toLowerCase() ?? "";

		const found = this.records.filter(
			(record) => ORDER[record.level] >= floor && (needle === "" || matches(record, needle)),
		);

		return { lines: found.slice(-limit).reverse(), matched: found.length };
	}

	get size(): number {
		return this.records.length;
	}

	clear(): void {
		this.records.length = 0;
	}
}

/** One buffer for the process, because the logger that feeds it is also one per process. */
export const logRing = new LogRing();
