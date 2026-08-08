import { toError } from "@core/errors";
import { type Logger } from "@core/logger";

/**
 * The bot stays up. Nothing below a deliberate shutdown is allowed to end the process, so every unexpected
 * failure lands here instead of terminating.
 *
 * The cost of never exiting is noise: one broken handler on a busy gateway can throw hundreds of times a second,
 * and a log that repeats the same line that often buries the one thing worth reading. So a repeated failure is
 * logged once, then collapsed into a periodic summary that says how many were swallowed.
 */

/** How long a signature stays collapsed before it is worth another line. */
export const SUMMARY_INTERVAL_MS = 60_000;

/** Without a bound, a failure whose message embeds a unique id would grow this map forever. */
const MAX_SIGNATURES = 500;

interface Seen {
	suppressed: number;
	lastLoggedAt: number;
}

export class ErrorThrottle {
	private readonly seen = new Map<string, Seen>();
	private readonly intervalMs: number;

	constructor(intervalMs = SUMMARY_INTERVAL_MS) {
		this.intervalMs = intervalMs;
	}

	/** Null when this occurrence should be swallowed; otherwise how many were swallowed since the last line. */
	consider(signature: string, now = Date.now()): { suppressed: number } | null {
		const existing = this.seen.get(signature);

		if (existing === undefined) {
			if (this.seen.size >= MAX_SIGNATURES) this.sweep(now);
			this.seen.set(signature, { suppressed: 0, lastLoggedAt: now });

			return { suppressed: 0 };
		}

		if (now - existing.lastLoggedAt < this.intervalMs) {
			existing.suppressed += 1;
			return null;
		}

		const suppressed = existing.suppressed;
		existing.suppressed = 0;
		existing.lastLoggedAt = now;

		return { suppressed };
	}

	private sweep(now: number): void {
		for (const [signature, entry] of this.seen) {
			if (now - entry.lastLoggedAt >= this.intervalMs) this.seen.delete(signature);
		}

		// Everything is still recent, so drop the oldest quarter rather than growing without bound.
		if (this.seen.size >= MAX_SIGNATURES) {
			const oldest = [...this.seen.entries()].sort((a, b) => a[1].lastLoggedAt - b[1].lastLoggedAt);
			for (const [signature] of oldest.slice(0, Math.ceil(MAX_SIGNATURES / 4))) this.seen.delete(signature);
		}
	}

	get size(): number {
		return this.seen.size;
	}
}

/** The name and message, so the same fault from the same place collapses while a different one still speaks. */
export function signatureOf(error: Error, scope: string): string {
	return `${scope}:${error.name}:${error.message}`;
}

/**
 * Records a failure nothing else handled, and returns rather than throwing.
 *
 * Callers must not act on the result: the point is that there is nothing left to do but write it down.
 */
export function reportSurvivable(
	logger: Logger,
	throttle: ErrorThrottle,
	scope: string,
	reason: unknown,
	now = Date.now(),
): void {
	const error = toError(reason);
	const verdict = throttle.consider(signatureOf(error, scope), now);
	if (verdict === null) return;

	logger.error(
		{ err: error, scope, ...(verdict.suppressed > 0 ? { repeatedSince: verdict.suppressed } : {}) },
		verdict.suppressed > 0
			? `[${scope}] Still failing — ${String(verdict.suppressed)} more since the last line. The bot is still running.`
			: `[${scope}] Something failed and was contained. The bot is still running.`,
	);
}
