import { getHeapStatistics } from "node:v8";
import { type TestifyClient } from "@core/client";
import { pingDatabase } from "@database/connection";
import { firstStatusSampleAt, type SampleInput, statusSamplesSince } from "@database/repositories/statusRepository";
import { commandTimes, type CommandTimes, eventLoopDelay, type LoopDelay } from "@lib/bot/performance.util";
import { recordOutcome, serviceChecks } from "@lib/infra/serviceHealth.util";
import { type MusicBinaries } from "@lib/music/music.types";
import { ageInDays, STALE_AFTER_DAYS } from "@lib/music/musicBinaries.util";
import {
	type CommandCheck,
	type DatabaseCheck,
	type EventLoopCheck,
	type GatewayCheck,
	type HistoryLevel,
	type MemoryCheck,
	type PackageCheck,
	type ServiceCheck,
	type StatusBucket,
	type StatusDay,
	type StatusLevel,
	STATUS_LIMITS,
	type StatusResponse,
} from "@testify/shared";

/** How healthy the bot is right now, and how it has been over the last month. */

export const DISCORD_API = "Discord API";

const MB = 1024 * 1024;
const DAY_MS = 86_400_000;

/** A heartbeat vouches for this long after it, which forgives a late timer without hiding a real outage. */
export const HEARTBEAT_GRACE_MS = STATUS_LIMITS.sampleEveryMs * 1.5;

const SEVERITY: Record<StatusLevel, number> = { unknown: 0, operational: 0, degraded: 1, down: 2 };

export function worst(levels: StatusLevel[]): StatusLevel {
	return levels.reduce<StatusLevel>(
		(current, level) => (SEVERITY[level] > SEVERITY[current] ? level : current),
		"operational",
	);
}

/** A slow reading is degraded; only a missing one is down. */
function byLatency(ms: number | null, slowMs: number): StatusLevel {
	if (ms === null) return "unknown";
	return ms > slowMs ? "degraded" : "operational";
}

export function gatewayCheck(ready: boolean, pingMs: number, shards: number): GatewayCheck {
	// discord.js reports -1 until the first heartbeat comes back.
	const ping = pingMs < 0 ? null : Math.round(pingMs);

	return { level: ready ? byLatency(ping, STATUS_LIMITS.gatewaySlowMs) : "down", pingMs: ping, shards };
}

export function databaseCheck(pingMs: number | null): DatabaseCheck {
	return { level: pingMs === null ? "down" : byLatency(pingMs, STATUS_LIMITS.databaseSlowMs), pingMs };
}

export function eventLoopCheck(delay: LoopDelay): EventLoopCheck {
	const { p99Ms } = delay;
	const level: StatusLevel =
		p99Ms === null
			? "unknown"
			: p99Ms > STATUS_LIMITS.eventLoopStalledMs
				? "down"
				: p99Ms > STATUS_LIMITS.eventLoopSlowMs
					? "degraded"
					: "operational";

	return { level, ...delay };
}

export function memoryCheck(heapUsed: number, heapLimit: number, rss: number): MemoryCheck {
	const share = heapLimit > 0 ? heapUsed / heapLimit : 0;
	const level: StatusLevel =
		share > STATUS_LIMITS.memoryFullShare
			? "down"
			: share > STATUS_LIMITS.memoryTightShare
				? "degraded"
				: "operational";

	return {
		level,
		heapUsedMb: Math.round(heapUsed / MB),
		heapLimitMb: Math.round(heapLimit / MB),
		rssMb: Math.round(rss / MB),
	};
}

export function commandCheck(times: CommandTimes): CommandCheck {
	if (times.runs === 0) return { level: "unknown", ...times };

	const failing =
		times.runs >= STATUS_LIMITS.commandMinimumRuns && times.failures / times.runs > STATUS_LIMITS.commandFailingShare;
	const slow = (times.p95Ms ?? 0) > STATUS_LIMITS.commandSlowMs;

	return { level: failing || slow ? "degraded" : "operational", ...times };
}

export function packageChecks(binaries: MusicBinaries, now = Date.now()): PackageCheck[] {
	const version = binaries.ytDlpVersion ?? null;
	const age = version === null ? null : ageInDays(version, now);
	const ytDlpLevel: StatusLevel =
		binaries.ytDlp === null ? "down" : age !== null && age > STALE_AFTER_DAYS ? "degraded" : "operational";

	return [
		{ key: "ytDlp", level: ytDlpLevel, installed: binaries.ytDlp !== null, version, ageDays: age },
		{
			key: "ffmpeg",
			// Music still plays without it; only the volume and non-Opus sources need it.
			level: binaries.ffmpeg === null ? "degraded" : "operational",
			installed: binaries.ffmpeg !== null,
			version: null,
			ageDays: null,
		},
	];
}

export interface OverallInputs {
	core: StatusLevel[];
	/** Packages and third-party services: their outage costs features, not the bot. */
	peripheral: StatusLevel[];
	paused: boolean;
}

export function overallLevel({ core, peripheral, paused }: OverallInputs): StatusLevel {
	const coreLevel = worst(core);
	if (coreLevel === "down") return "down";

	const capped = peripheral.map((level) => (level === "down" ? "degraded" : level));
	return worst([coreLevel, ...capped, paused ? "degraded" : "operational"]);
}

interface Point {
	at: number;
	level: StatusLevel;
	gatewayPingMs: number | null;
}

interface Coverage {
	upMs: number;
	downMs: number;
	levels: StatusLevel[];
	pings: number[];
}

/** How much of `[from, to)` the heartbeats vouch for, each one until the next or until its grace runs out. */
export function coverage(points: Point[], from: number, to: number, now: number): Coverage {
	const result: Coverage = { upMs: 0, downMs: 0, levels: [], pings: [] };

	points.forEach((point, index) => {
		const next = points[index + 1]?.at ?? Number.POSITIVE_INFINITY;
		const start = Math.max(point.at, from);
		const end = Math.min(point.at + HEARTBEAT_GRACE_MS, next, now, to);
		if (end <= start) return;

		if (point.level === "down") result.downMs += end - start;
		else result.upMs += end - start;

		result.levels.push(point.level);
		if (point.at >= from && point.at < to && point.gatewayPingMs !== null) result.pings.push(point.gatewayPingMs);
	});

	return result;
}

function toPoints(samples: SampleInput[]): Point[] {
	return samples.map((sample) => ({
		at: sample.at.getTime(),
		level: sample.level,
		gatewayPingMs: sample.gatewayPingMs,
	}));
}

function dayStart(at: number): number {
	return Math.floor(at / DAY_MS) * DAY_MS;
}

export function uptimeDays(samples: SampleInput[], firstAt: number | null, now: number): StatusDay[] {
	const points = toPoints(samples);
	const today = dayStart(now);

	return Array.from({ length: STATUS_LIMITS.historyDays }, (_, index) => {
		const start = today - (STATUS_LIMITS.historyDays - 1 - index) * DAY_MS;
		const day = new Date(start).toISOString().slice(0, 10);
		if (firstAt === null) return { day, uptime: null };

		const from = Math.max(start, firstAt);
		const to = Math.min(start + DAY_MS, now);
		if (to <= from) return { day, uptime: null };

		const { upMs } = coverage(points, from, to, now);
		return { day, uptime: Math.min(1, upMs / (to - from)) };
	});
}

export function recentBuckets(samples: SampleInput[], firstAt: number | null, now: number): StatusBucket[] {
	const points = toPoints(samples);
	const size = STATUS_LIMITS.recentBucketMs;
	// The bucket that holds the moment just before now, so a boundary never leaves the newest one empty.
	const last = Math.floor((now - 1) / size) * size;

	return Array.from({ length: STATUS_LIMITS.recentBuckets }, (_, index) => {
		const start = last - (STATUS_LIMITS.recentBuckets - 1 - index) * size;
		const from = firstAt === null ? Number.POSITIVE_INFINITY : Math.max(start, firstAt);
		const to = Math.min(start + size, now);
		const bucket = { start: new Date(start).toISOString() };

		if (to <= from) return { ...bucket, level: "none" satisfies HistoryLevel, gatewayPingMs: null };

		const covered = coverage(points, from, to, now);
		const offlineMs = to - from - covered.upMs - covered.downMs;
		const pingMs =
			covered.pings.length === 0
				? null
				: Math.round(covered.pings.reduce((sum, ping) => sum + ping, 0) / covered.pings.length);

		let level: HistoryLevel;
		if (covered.levels.length === 0) level = "offline";
		else level = worst([...covered.levels, offlineMs > STATUS_LIMITS.sampleEveryMs ? "degraded" : "operational"]);

		return { ...bucket, level, gatewayPingMs: pingMs };
	});
}

export type LiveStatus = Omit<StatusResponse, "days" | "recent">;

export interface StatusSources {
	binaries: MusicBinaries;
	now?: number;
	pingDatabase?: () => Promise<number | null>;
}

export async function liveStatus(client: TestifyClient, sources: StatusSources): Promise<LiveStatus> {
	const now = sources.now ?? Date.now();
	const memory = process.memoryUsage();

	const gateway = gatewayCheck(client.isReady(), client.ws.ping, client.ws.shards.size);
	const database = databaseCheck(await (sources.pingDatabase ?? pingDatabase)());
	const eventLoop = eventLoopCheck(eventLoopDelay());
	const heap = memoryCheck(memory.heapUsed, getHeapStatistics().heap_size_limit, memory.rss);
	const commands = commandCheck(commandTimes(now));
	const packages = packageChecks(sources.binaries, now);
	const services: ServiceCheck[] = serviceChecks(now);

	const discord = services.filter((service) => service.name === DISCORD_API).map((service) => service.level);
	const others = services.filter((service) => service.name !== DISCORD_API).map((service) => service.level);

	return {
		level: overallLevel({
			core: [gateway.level, database.level, eventLoop.level, heap.level, ...discord],
			peripheral: [commands.level, ...packages.map((check) => check.level), ...others],
			paused: client.paused,
		}),
		checkedAt: new Date(now).toISOString(),
		startedAt: new Date(client.startedAt).toISOString(),
		uptimeMs: now - client.startedAt,
		paused: client.paused,
		gateway,
		database,
		eventLoop,
		memory: heap,
		commands,
		packages,
		services,
	};
}

export async function statusReport(client: TestifyClient, sources: StatusSources): Promise<StatusResponse> {
	const now = sources.now ?? Date.now();
	const live = await liveStatus(client, { ...sources, now });

	let samples: SampleInput[] = [];
	let firstAt: number | null = null;

	// The history is a nicety; a database that cannot answer is already reported as down above.
	if (live.database.level !== "down") {
		try {
			[samples, firstAt] = await Promise.all([
				statusSamplesSince(new Date(dayStart(now) - (STATUS_LIMITS.historyDays - 1) * DAY_MS)),
				firstStatusSampleAt().then((first) => first?.getTime() ?? null),
			]);
		} catch (error) {
			client.logger.debug({ err: error }, "[STATUS] Could not read the heartbeat history.");
		}
	}

	return { ...live, days: uptimeDays(samples, firstAt, now), recent: recentBuckets(samples, firstAt, now) };
}

/** Discord's REST client reports every response it gets, so its health is recorded without a single extra call. */
export function watchDiscordApi(client: TestifyClient): void {
	client.rest.on("response", (_request, response) => {
		// A 4xx is Discord refusing this request, which says nothing about whether Discord is up.
		recordOutcome(DISCORD_API, { ok: response.status < 500, at: Date.now(), latencyMs: null });
	});
}
