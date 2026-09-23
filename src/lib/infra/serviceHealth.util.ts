import { STATUS_LIMITS, type ServiceCheck, type StatusLevel } from "@testify/shared";

/** What each outside service did the last few times the bot called it, recorded as it happens rather than probed. */

export interface Outcome {
	ok: boolean;
	at: number;
	latencyMs: number | null;
}

const KEPT_PER_SERVICE = 20;
const MAX_SERVICES = 50;

const outcomes = new Map<string, Outcome[]>();

export function recordOutcome(service: string, outcome: Outcome): void {
	let kept = outcomes.get(service);

	if (kept === undefined) {
		if (outcomes.size >= MAX_SERVICES) return;
		kept = [];
		outcomes.set(service, kept);
	}

	kept.push(outcome);
	if (kept.length > KEPT_PER_SERVICE) kept.shift();
}

export interface ObserveOptions {
	/** False for a failure that is the request's fault rather than the service's, such as a deleted video. */
	blame?: (error: unknown) => boolean;
	now?: () => number;
}

/** Runs `task` and records how it went, rethrowing whatever it threw. */
export async function observe<T>(service: string, task: () => Promise<T>, options: ObserveOptions = {}): Promise<T> {
	const now = options.now ?? Date.now;
	const started = now();

	try {
		const result = await task();
		recordOutcome(service, { ok: true, at: now(), latencyMs: now() - started });
		return result;
	} catch (error) {
		const blamed = options.blame?.(error) ?? true;
		recordOutcome(service, { ok: !blamed, at: now(), latencyMs: now() - started });
		throw error;
	}
}

/** Down after a run of failures, degraded after any; a service not called within the window says nothing. */
export function serviceLevel(recent: Outcome[]): StatusLevel {
	if (recent.length === 0) return "unknown";

	const trailing = recent.slice(-STATUS_LIMITS.serviceDownAfter);
	if (trailing.length === STATUS_LIMITS.serviceDownAfter && trailing.every((outcome) => !outcome.ok)) return "down";

	return recent.some((outcome) => !outcome.ok) ? "degraded" : "operational";
}

export function serviceChecks(now = Date.now()): ServiceCheck[] {
	return [...outcomes.entries()]
		.map(([name, kept]) => {
			const recent = kept.filter((outcome) => now - outcome.at <= STATUS_LIMITS.windowMs);
			const last = kept.at(-1);

			return {
				name,
				level: serviceLevel(recent),
				calls: recent.length,
				failures: recent.filter((outcome) => !outcome.ok).length,
				lastAt: last === undefined ? null : new Date(last.at).toISOString(),
				lastOk: last?.ok ?? null,
				latencyMs: last?.latencyMs ?? null,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function resetServiceHealth(): void {
	outcomes.clear();
}
