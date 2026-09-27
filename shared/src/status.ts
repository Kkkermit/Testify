/** The status page's contract: what the bot reports about its own health, and where "slow" starts. */

export const STATUS_LEVELS = ["operational", "degraded", "down", "unknown"] as const;

export type StatusLevel = (typeof STATUS_LEVELS)[number];

/** A stretch of history: a level, `offline` when no heartbeat arrived, or `none` before the first one ever did. */
export type HistoryLevel = StatusLevel | "offline" | "none";

export const STATUS_LIMITS = {
	sampleEveryMs: 300_000,
	historyDays: 30,
	recentBuckets: 48,
	recentBucketMs: 1_800_000,
	gatewaySlowMs: 400,
	databaseSlowMs: 250,
	eventLoopSlowMs: 100,
	eventLoopStalledMs: 1_000,
	memoryTightShare: 0.85,
	memoryFullShare: 0.95,
	commandSlowMs: 5_000,
	commandFailingShare: 0.25,
	/** Fewer runs than this say nothing about a failure rate. */
	commandMinimumRuns: 4,
	windowMs: 3_600_000,
	serviceDownAfter: 3,
} as const;

export interface GatewayCheck {
	level: StatusLevel;
	/** Null until the first heartbeat comes back. */
	pingMs: number | null;
	shards: number;
}

export interface DatabaseCheck {
	level: StatusLevel;
	/** Null when the ping did not answer at all. */
	pingMs: number | null;
}

export interface EventLoopCheck {
	level: StatusLevel;
	p50Ms: number | null;
	p99Ms: number | null;
	maxMs: number | null;
}

export interface MemoryCheck {
	level: StatusLevel;
	heapUsedMb: number;
	heapLimitMb: number;
	rssMb: number;
}

export interface CommandCheck {
	level: StatusLevel;
	/** Counted over the last `STATUS_LIMITS.windowMs`. */
	runs: number;
	failures: number;
	p50Ms: number | null;
	p95Ms: number | null;
}

export const STATUS_PACKAGES = ["ytDlp", "ffmpeg"] as const;

export type StatusPackage = (typeof STATUS_PACKAGES)[number];

export interface PackageCheck {
	key: StatusPackage;
	level: StatusLevel;
	installed: boolean;
	version: string | null;
	ageDays: number | null;
}

export interface ServiceCheck {
	name: string;
	level: StatusLevel;
	/** Counted over the last `STATUS_LIMITS.windowMs`. */
	calls: number;
	failures: number;
	lastAt: string | null;
	lastOk: boolean | null;
	/** Null for a service whose calls are observed without being timed. */
	latencyMs: number | null;
}

export interface StatusDay {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	/** A share from 0 to 1, or null for a day before the first heartbeat. */
	uptime: number | null;
}

export interface StatusBucket {
	start: string;
	level: HistoryLevel;
	gatewayPingMs: number | null;
}

export interface StatusResponse {
	level: StatusLevel;
	checkedAt: string;
	startedAt: string;
	uptimeMs: number;
	paused: boolean;
	gateway: GatewayCheck;
	database: DatabaseCheck;
	eventLoop: EventLoopCheck;
	memory: MemoryCheck;
	commands: CommandCheck;
	packages: PackageCheck[];
	services: ServiceCheck[];
	days: StatusDay[];
	recent: StatusBucket[];
}
