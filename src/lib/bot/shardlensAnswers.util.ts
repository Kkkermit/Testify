import { type EventPropValues, type QueryResults } from "@shardlens/client";
import { z } from "zod";

/** The shape of every answer the owner console reads from the collector, checked again because the client checks none. */

const count = z
	.number()
	.nullable()
	.transform((value) => value ?? 0);

const maybe = z
	.number()
	.nullable()
	.optional()
	.transform((value) => value ?? null);

const bucketRows = z.array(z.object({ bucket: z.string(), servers: count }));

const tallyRows = z.array(z.object({ key: z.string().nullable(), value: count }));

const time = z.string().max(40);

/** Rows added in a later collector arrive empty from an older one, rather than refusing the whole answer. */
const later = <T extends z.ZodType>(rows: T) => z.array(rows).default([]);

/** One schema per query kind, picked by the query's own `kind`. */
export const COLLECTOR_ANSWERS = {
	top: z.object({
		rows: z.array(z.object({ key: z.string(), value: z.number().nullable(), count: count.optional() })),
	}),
	series: z.object({ points: z.array(z.object({ t: z.string(), key: z.string().nullable(), value: count })) }),
	eventProps: z.object({ values: z.array(z.object({ value: z.string(), count })) }),
	events: z.object({ rows: z.array(z.object({ name: z.string(), count, users: count, lastSeen: time })) }),
	commands: z.object({
		rows: z.array(
			z.object({ command: z.string(), runs: count, errorRate: z.number().nullable(), p95Ms: z.number().nullable() }),
		),
	}),
	command: z.object({
		from: time,
		totals: z.object({
			runs: count,
			ok: count,
			error: count,
			timeout: count,
			noResponse: count,
			deferRate: maybe,
			ephemeralRate: maybe,
			over3sRate: maybe,
			handlerP95Ms: maybe,
			firstSeen: time.nullable(),
			lastSeen: time.nullable(),
		}),
		latencyHistogram: z.array(count).nullable(),
		kinds: tallyRows,
		subcommands: tallyRows,
		options: tallyRows,
		optionValues: z.array(z.object({ option: z.string(), value: z.string(), runs: count })),
		memberTiers: tallyRows,
		installs: tallyRows,
		contexts: tallyRows,
		channelTypes: tallyRows,
		locales: tallyRows,
		topServers: z.array(z.object({ key: z.string(), value: count })),
		components: z.array(z.object({ key: z.string().nullable(), kind: z.string(), value: count })),
		modals: z.array(z.object({ customId: z.string(), shown: count, submitted: count })),
	}),
	server: z.object({
		found: z.boolean(),
		uniqueUsersThisPeriod: z.number().nullable().optional(),
		profile: z
			.object({
				sizeAtJoin: maybe,
				firstCommandAt: time.nullable(),
				lastCommandAt: time.nullable(),
			})
			.optional(),
		events: later(
			z.object({
				ts: time,
				kind: z.enum(["join", "leave", "unavailable", "available"]),
				detectedAtStartup: z.boolean(),
			}),
		),
		missingPermissions: z
			.string()
			.regex(/^\d{1,25}$/)
			.nullable()
			.optional(),
	}),
	overview: z.object({
		app: z
			.object({
				name: z.string(),
				mode: z.enum(["privacy", "audit"]),
				saltPeriod: z.enum(["day", "week", "month"]),
				timezone: z.string(),
				rawRetentionDays: z.number(),
			})
			.nullable(),
		appInfo: z
			.object({
				ts: time,
				approxGuilds: maybe,
				approxUserInstalls: maybe,
				sessionStartRemaining: maybe,
				sessionStartTotal: maybe,
				nodeVersion: z.string().nullable(),
				libVersion: z.string().nullable(),
				sdkVersion: z.string().nullable(),
				release: z.string().nullable(),
			})
			.nullable(),
		sdkInstances: z.array(
			z.object({
				instance: z.string(),
				ts: time,
				shards: z.array(z.number()),
				queueDepth: count,
				dropped: z.record(z.string(), z.number()),
				failedFlushes: count,
				internalErrors: z.record(z.string(), z.number()),
				sdkVersion: z.string().nullable(),
			}),
		),
		servers: count,
		uniqueUsersThisPeriod: maybe,
		lastEventAt: time.nullable(),
		checklist: z.object({
			receivingEvents: z.boolean(),
			appInfoReceived: z.boolean(),
			webhookEventsEnabled: z.boolean(),
			requiredPermissionsSet: z.boolean(),
		}),
	}),
	heatmap: z.object({ cells: z.array(z.object({ weekday: z.number(), hour: z.number(), value: count })) }),
	growth: z.object({
		daily: z.array(
			z.object({
				day: z.string(),
				joins: count,
				leaves: count,
				joinsDetected: count.optional(),
				leavesDetected: count.optional(),
			}),
		),
		sizeAtInstall: bucketRows,
		activation: z.object({ joined: count.optional(), activated: count.optional(), rate: maybe }),
		installs: z.object({ active: count, inactive: count }).nullable().optional(),
		cohorts: later(z.object({ cohort: z.string(), week: z.number(), servers: count })),
		lifetimes: bucketRows,
		approximateGuilds: later(z.object({ day: z.string(), value: count })),
		serverCount: z.object({ ours: count, discord: maybe, warn: z.boolean() }),
	}),
	installs: z.object({
		daily: z.array(z.object({ day: z.string(), userInstalls: count, userRemovals: count, serverInstalls: count })),
		scopes: z.array(z.object({ scope: z.string(), installs: count })),
		webhookStatus: maybe,
	}),
	audience: z.object({
		daily: z.array(z.object({ day: z.string(), users: count, newUsers: count })),
		weekly: later(z.object({ week: z.string(), users: count })),
		periods: later(z.object({ period: z.string(), users: count, final: z.boolean() })),
		stickiness: maybe,
		splits: z.record(z.string(), tallyRows.optional()),
	}),
	reliability: z.object({
		from: z.string(),
		totals: z
			.object({
				runs: count,
				missedDeadlines: count,
				noResponse: count,
				errors: count,
				over3sRate: maybe,
				p50Ms: maybe,
				p95Ms: maybe,
				p99Ms: maybe,
			})
			.nullable(),
		errorsByCode: z.array(z.object({ key: z.string(), value: count })),
		routes: later(
			z.object({
				method: z.string(),
				route: z.string(),
				calls: count,
				failures: count,
				retries: count,
				p95Ms: maybe,
			}),
		),
		rateLimits: z.array(z.object({ scope: z.string().nullable(), route: z.string().nullable(), count })),
		invalidBudget: z.object({ used: count, limit: count, share: z.number() }).nullable().optional(),
		identify: z.object({ remaining: maybe, total: maybe }).nullable().optional(),
		shards: z.array(z.object({ shard: z.number(), ping: count, stale: z.boolean() })),
		shardEvents: z.array(z.object({ ts: z.string(), shard: z.number(), state: z.string(), closeCode: maybe })),
	}),
	gauge: z.object({ points: z.array(z.object({ t: z.string(), value: maybe, max: maybe })) }),
	bursts: z.object({ rows: z.array(z.object({ minute: time, runs: count, median: count })) }),
	funnel: z.object({ steps: z.array(z.object({ name: z.string(), users: count, medianSeconds: maybe })) }),
	retention: z.object({
		periods: z.number(),
		cohorts: z.array(z.object({ cohort: z.string(), size: count, retained: z.array(count) })),
	}),
} as const;

export type AnswerKind = keyof typeof COLLECTOR_ANSWERS;
export type AnswerOf<K extends AnswerKind> = z.output<(typeof COLLECTOR_ANSWERS)[K]>;

/** Every query here asks `eventProps` for one property, so its answer is always the values. */
type Declared<K extends AnswerKind> = K extends "eventProps" ? EventPropValues : QueryResults[K];

/** A schema that would refuse what the client says the collector sends is a compile error, not a blank chart. */
const takesWhatIsSent: {
	[K in AnswerKind]: Declared<K> extends z.input<(typeof COLLECTOR_ANSWERS)[K]> ? true : never;
} = {
	top: true,
	series: true,
	eventProps: true,
	events: true,
	commands: true,
	command: true,
	server: true,
	overview: true,
	heatmap: true,
	growth: true,
	installs: true,
	audience: true,
	reliability: true,
	gauge: true,
	bursts: true,
	funnel: true,
	retention: true,
};
void takesWhatIsSent;

export const metaAnswer = z.object({
	rawRetentionDays: z.number(),
	mode: z.string(),
	auditKeyConfigured: z.boolean().default(false),
	discordLogin: z.boolean().default(false),
});
