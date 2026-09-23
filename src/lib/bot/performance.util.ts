import { type IntervalHistogram, monitorEventLoopDelay } from "node:perf_hooks";
import { STATUS_LIMITS } from "@testify/shared";

/** How long the process takes to get round to things: event-loop delay, and how long commands take to answer. */

const NS_PER_MS = 1_000_000;

let histogram: IntervalHistogram | null = null;

/** Idempotent, so the scheduler and a test can both call it. */
export function startEventLoopMonitor(): void {
	if (histogram !== null) return;
	histogram = monitorEventLoopDelay({ resolution: 20 });
	histogram.enable();
}

export function stopEventLoopMonitor(): void {
	histogram?.disable();
	histogram = null;
}

export interface LoopDelay {
	p50Ms: number | null;
	p99Ms: number | null;
	maxMs: number | null;
}

const toMs = (ns: number): number => Math.round((ns / NS_PER_MS) * 10) / 10;

/** Since the last `resetEventLoopDelay`, which the heartbeat calls so each sample covers its own window. */
export function eventLoopDelay(): LoopDelay {
	if (histogram === null || histogram.count === 0) return { p50Ms: null, p99Ms: null, maxMs: null };

	return {
		p50Ms: toMs(histogram.percentile(50)),
		p99Ms: toMs(histogram.percentile(99)),
		maxMs: toMs(histogram.max),
	};
}

export function resetEventLoopDelay(): void {
	histogram?.reset();
}

interface Timing {
	at: number;
	ms: number;
	ok: boolean;
}

const KEPT_TIMINGS = 500;
const timings: Timing[] = [];

export function recordCommandTime(ms: number, ok: boolean, at = Date.now()): void {
	timings.push({ at, ms, ok });
	if (timings.length > KEPT_TIMINGS) timings.shift();
}

export interface CommandTimes {
	runs: number;
	failures: number;
	p50Ms: number | null;
	p95Ms: number | null;
}

/** Nearest-rank, which never invents a value no command actually took. */
export function percentile(sorted: number[], share: number): number | null {
	if (sorted.length === 0) return null;
	const rank = Math.max(1, Math.ceil(share * sorted.length));

	return sorted[rank - 1] ?? null;
}

export function commandTimes(now = Date.now()): CommandTimes {
	const recent = timings.filter((timing) => now - timing.at <= STATUS_LIMITS.windowMs);
	const sorted = recent.map((timing) => timing.ms).sort((a, b) => a - b);

	return {
		runs: recent.length,
		failures: recent.filter((timing) => !timing.ok).length,
		p50Ms: percentile(sorted, 0.5),
		p95Ms: percentile(sorted, 0.95),
	};
}

export function resetCommandTimes(): void {
	timings.length = 0;
}
