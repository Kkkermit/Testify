import { toError } from "@core/errors";
import { type Logger } from "@core/logger";

/**
 * Every failure nothing else handled lands here instead of ending the process; a repeated one is logged once, then
 * summarised.
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

/** The status of a gateway handshake Discord's side refused, which `ws` reports by that status alone. */
export function gatewayRefusal(error: Error, scope: string): number | null {
	if (!/^(GATEWAY|SHARD_\d+)$/.test(scope)) return null;

	const match = /^Unexpected server response: (5\d\d)$/.exec(error.message);
	return match === null ? null : Number(match[1]);
}

/** Records a failure nothing else handled, and returns rather than throwing. */
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

	const repeated = verdict.suppressed > 0 ? { repeatedSince: verdict.suppressed } : {};
	const refusal = gatewayRefusal(error, scope);

	if (refusal !== null) {
		logger.warn(
			{ scope, status: refusal, ...repeated },
			`[${scope}] Discord's gateway refused the connection (${String(refusal)})` +
				(verdict.suppressed > 0 ? `, ${String(verdict.suppressed)} more times since the last line` : "") +
				". The bot is retrying on its own; check https://discordstatus.com if this keeps repeating.",
		);
		return;
	}

	logger.error(
		{ err: error, scope, ...repeated },
		verdict.suppressed > 0
			? `[${scope}] Still failing — ${String(verdict.suppressed)} more since the last line. The bot is still running.`
			: `[${scope}] Something failed and was contained. The bot is still running.`,
	);
}
