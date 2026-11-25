import { type Filter, type SeriesMetric, type TopQuery } from "@shardlens/client";
import { type TestifyClient } from "@core/client";
import { LENS_EVENTS, ownHandler } from "@lib/bot/shardlens.util";
import {
	ALL_ROWS,
	askFor,
	commandStep,
	dailySeries,
	eventProps,
	FAILED_OUTCOMES,
	readerFor,
	windowDays,
} from "@lib/bot/shardlensReader.util";
import {
	type AudienceReport,
	AUTOMATIC_ACTIONS,
	type BotActivityReport,
	type CollectorSetup,
	type FunnelReport,
	type GrowthReport,
	type PanelButtonRow,
	type PanelFormRow,
	type PanelsReport,
	type ReliabilityReport,
	type RetentionReport,
	type Tally,
} from "@testify/shared";

/** The owner console's Usage sections beyond commands, each read from Shardlens on its own. */

const SHOWN = 15;
/** Weeks after adding the bot shown for a server's cohort; a quarter is as far as the window reaches. */
const MAX_COHORT_WEEK = 13;
const LATE = new Set(["timeout", "no_response"]);

const byCount = (a: Tally, b: Tally): number => b.count - a.count || a.key.localeCompare(b.key);

export function tallies(rows: { key: string | null; value: number }[], limit = SHOWN): Tally[] {
	const counts = new Map<string, number>();
	for (const { key, value } of rows) {
		if (key === null || key === "" || value <= 0) continue;
		counts.set(key, (counts.get(key) ?? 0) + value);
	}
	return [...counts]
		.map(([key, count]) => ({ key, count }))
		.sort(byCount)
		.slice(0, limit);
}

const valuesOf = (answer: { values: { value: string; count: number }[] }): Tally[] =>
	tallies(answer.values.map(({ value, count }) => ({ key: value === "null" ? null : value, value: count })));

const sum = (points: { value: number }[]): number => points.reduce((total, point) => total + point.value, 0);

export async function audienceReport(
	client: TestifyClient,
	days: number,
	timezone: string,
	now = Date.now(),
): Promise<AudienceReport> {
	const ask = askFor(client, days, now);
	const [audience, heat] = await Promise.all([
		ask({ kind: "audience" }),
		ask({ kind: "heatmap", metric: "interactions", timezone }),
	]);

	const byDay = new Map(audience.daily.map((row) => [row.day, row]));
	const languages = [...client.guilds.cache.values()].map((guild) => ({ key: guild.preferredLocale, value: 1 }));

	return {
		days,
		daily: windowDays(days, now).map((day) => ({
			day,
			users: byDay.get(day)?.users ?? 0,
			newUsers: byDay.get(day)?.newUsers ?? 0,
		})),
		stickiness: audience.stickiness,
		userLanguages: tallies(audience.splits.locale ?? []),
		serverLanguages: tallies(languages),
		tiers: tallies(audience.splits.tier ?? []),
		contexts: tallies(audience.splits.context ?? []),
		hours: {
			timezone,
			cells: heat.cells
				.filter((cell) => cell.value > 0)
				.map((cell) => ({ weekday: cell.weekday, hour: cell.hour, count: cell.value })),
		},
		weekly: [...audience.weekly].sort((a, b) => a.week.localeCompare(b.week)),
		periods: [...audience.periods].sort((a, b) => a.period.localeCompare(b.period)),
		installs: tallies(audience.splits.install ?? []),
	};
}

const buckets = (rows: { bucket: string; servers: number }[]): Tally[] =>
	rows.filter((row) => row.servers > 0).map((row) => ({ key: row.bucket, count: row.servers }));

/** Weeks a server was active in, from the week it added the bot, so a week nobody ran anything is a zero. */
function serverCohorts(rows: { cohort: string; week: number; servers: number }[]): GrowthReport["cohorts"] {
	const byCohort = new Map<string, number[]>();
	for (const { cohort, week, servers } of rows) {
		if (!Number.isInteger(week) || week < 0 || week > MAX_COHORT_WEEK) continue;
		const weeks = byCohort.get(cohort) ?? [];
		weeks[week] = servers;
		byCohort.set(cohort, weeks);
	}
	return [...byCohort]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([cohort, weeks]) => ({ cohort, weeks: Array.from({ length: weeks.length }, (_, week) => weeks[week] ?? 0) }));
}

export async function growthReport(client: TestifyClient, days: number, now = Date.now()): Promise<GrowthReport> {
	const ask = askFor(client, days, now);
	const [growth, installs] = await Promise.all([
		ask({ kind: "growth", timezone: "UTC" }),
		ask({ kind: "installs", timezone: "UTC" }),
	]);

	const window = windowDays(days, now);
	const byDay = new Map(growth.daily.map((row) => [row.day, row]));
	const daily = window.map((day) => ({
		day,
		joins: byDay.get(day)?.joins ?? 0,
		leaves: byDay.get(day)?.leaves ?? 0,
	}));
	const discordBy = new Map(growth.approximateGuilds.map((row) => [row.day, row.value]));
	const installsBy = new Map(installs.daily.map((row) => [row.day, row]));

	return {
		days,
		daily,
		joins: daily.reduce((total, day) => total + day.joins, 0),
		leaves: daily.reduce((total, day) => total + day.leaves, 0),
		activation: {
			joined: growth.activation.joined ?? 0,
			activated: growth.activation.activated ?? 0,
			rate: growth.activation.rate,
		},
		installs: growth.installs ?? null,
		sizeAtInstall: buckets(growth.sizeAtInstall),
		lifetimes: buckets(growth.lifetimes),
		serverCount: growth.serverCount,
		detected: {
			joins: growth.daily.reduce((total, row) => total + (row.joinsDetected ?? 0), 0),
			leaves: growth.daily.reduce((total, row) => total + (row.leavesDetected ?? 0), 0),
		},
		discordCount: window.map((day) => ({ day, value: discordBy.get(day) ?? null })),
		cohorts: serverCohorts(growth.cohorts),
		installsFromDiscord: {
			webhookStatus: installs.webhookStatus,
			daily: window.map((day) => ({
				day,
				serverInstalls: installsBy.get(day)?.serverInstalls ?? 0,
				userInstalls: installsBy.get(day)?.userInstalls ?? 0,
				userRemovals: installsBy.get(day)?.userRemovals ?? 0,
			})),
			scopes: tallies(installs.scopes.map((row) => ({ key: row.scope, value: row.installs }))),
		},
	};
}

/** A form opened from a button is filed under the button's ID, and one submitted under its own, so both sum by handler. */
export function formsByHandler(
	client: TestifyClient,
	rows: { customId: string; shown: number; submitted: number }[],
): PanelFormRow[] {
	const forms = new Map<string, PanelFormRow>();
	for (const { customId, shown, submitted } of rows) {
		const handler = ownHandler(client, customId);
		if (handler === null) continue;
		const row = forms.get(handler.id) ?? { id: handler.id, shown: 0, submitted: 0 };
		row.shown += shown;
		row.submitted += submitted;
		forms.set(handler.id, row);
	}
	return [...forms.values()]
		.filter((row) => row.shown > 0)
		.sort((a, b) => abandoned(b) - abandoned(a) || b.shown - a.shown || a.id.localeCompare(b.id))
		.slice(0, SHOWN);
}

export async function panelsReport(client: TestifyClient, days: number, now = Date.now()): Promise<PanelsReport> {
	const ask = askFor(client, days, now);
	const top = (metric: SeriesMetric, filters: Filter[] = []): Omit<TopQuery, "range"> => ({
		kind: "top",
		metric,
		groupBy: "custom_id",
		filters,
		limit: ALL_ROWS,
	});

	const [pressed, failed, shown, submitted] = await Promise.all([
		ask(top("components")),
		ask(top("components", [{ field: "outcome", op: "in", value: FAILED_OUTCOMES }])),
		ask(top("modals.shown")),
		ask(top("modals.submitted")),
	]);

	// Only the bot's own handlers, so nothing but the names it gave its buttons ever reaches the page.
	const rows = new Map<string, PanelButtonRow & { byAction: Map<string, number> }>();
	const rowOf = (id: string): PanelButtonRow & { byAction: Map<string, number> } => {
		let row = rows.get(id);
		if (row === undefined) {
			row = { id, presses: 0, failures: 0, actions: [], byAction: new Map() };
			rows.set(id, row);
		}
		return row;
	};

	for (const { key, value } of pressed.rows) {
		const handler = ownHandler(client, key);
		if (handler === null) continue;
		const row = rowOf(handler.id);
		row.presses += value ?? 0;
		if (handler.action !== "") {
			row.byAction.set(handler.action, (row.byAction.get(handler.action) ?? 0) + (value ?? 0));
		}
	}
	for (const { key, value } of failed.rows) {
		const handler = ownHandler(client, key);
		if (handler !== null) rowOf(handler.id).failures += value ?? 0;
	}

	return {
		days,
		buttons: [...rows.values()]
			.filter((row) => row.presses > 0)
			.map(({ byAction, ...row }) => ({
				...row,
				actions: [...byAction].map(([key, count]) => ({ key, count })).sort(byCount),
			}))
			.sort((a, b) => b.presses - a.presses || a.id.localeCompare(b.id))
			.slice(0, SHOWN),
		forms: formsByHandler(client, [
			...shown.rows.map((row) => ({ customId: row.key, shown: row.value ?? 0, submitted: 0 })),
			...submitted.rows.map((row) => ({ customId: row.key, shown: 0, submitted: row.value ?? 0 })),
		]),
	};
}

/** Never below zero: a form shown before the window can be submitted inside it. */
const abandoned = (row: PanelFormRow): number => Math.max(0, row.shown - row.submitted);

export async function botActivityReport(
	client: TestifyClient,
	days: number,
	now = Date.now(),
): Promise<BotActivityReport> {
	const ask = askFor(client, days, now);
	const reader = readerFor(client);
	// A custom event's daily rollup outlasts its raw events, so totals reach further back than the breakdowns.
	const total = async (name: string): Promise<number> => sum((await ask(dailySeries("custom", { name }))).points);
	const values = async (name: string, prop: string): Promise<Tally[]> => valuesOf(await ask(eventProps(name, prop)));

	const [
		[played, skipped, refused, answered, unanswered, refusals, changes],
		automatic,
		[sources, skipCauses, refuseCauses, answeredBy, refusedBy, articles, reasons, commands, screens, ways],
		meta,
		events,
	] = await Promise.all([
		Promise.all(
			[
				LENS_EVENTS.musicPlayed,
				LENS_EVENTS.musicSkipped,
				LENS_EVENTS.musicRefused,
				LENS_EVENTS.supportAnswered,
				LENS_EVENTS.supportRefused,
				LENS_EVENTS.commandRefused,
				LENS_EVENTS.dashboardChange,
			].map(total),
		),
		Promise.all(AUTOMATIC_ACTIONS.map(async (action) => ({ action, count: await total(action) }))),
		Promise.all([
			values(LENS_EVENTS.musicPlayed, "source"),
			values(LENS_EVENTS.musicSkipped, "cause"),
			values(LENS_EVENTS.musicRefused, "cause"),
			values(LENS_EVENTS.supportAnswered, "by"),
			values(LENS_EVENTS.supportRefused, "by"),
			values(LENS_EVENTS.supportAnswered, "article"),
			values(LENS_EVENTS.commandRefused, "reason"),
			values(LENS_EVENTS.commandRefused, "command"),
			values(LENS_EVENTS.dashboardChange, "screen"),
			values(LENS_EVENTS.dashboardChange, "how"),
		]),
		reader.meta(),
		ask({ kind: "events" }),
	]);

	const causes = tallies([...skipCauses, ...refuseCauses].map(({ key, count }) => ({ key, value: count }))).flatMap(
		({ key, count }) => {
			const [source = "", reason = ""] = key.split("/");
			return source === "" || reason === "" ? [] : [{ source, reason, count }];
		},
	);

	return {
		days,
		detailDays: Math.min(days, meta.rawRetentionDays),
		music: { played: played ?? 0, skipped: skipped ?? 0, refused: refused ?? 0, sources, causes },
		support: { answered: answered ?? 0, refused: unanswered ?? 0, answeredBy, refusedBy, articles },
		refusals: { total: refusals ?? 0, reasons, commands },
		automatic,
		changes: { total: changes ?? 0, screens, ways },
		events: events.rows.map((row) => ({ name: row.name, count: row.count, people: row.users, lastAt: row.lastSeen })),
	};
}

const dayOf = (t: string): string => t.slice(0, 10);

export async function reliabilityReport(
	client: TestifyClient,
	days: number,
	now = Date.now(),
): Promise<ReliabilityReport> {
	const ask = askFor(client, days, now);

	const daily = (name: string) => ask({ kind: "gauge", name, interval: "day", timezone: "UTC" });

	const [reliability, outcomes, limits, ping, memory, eventLoop, bursts] = await Promise.all([
		ask({ kind: "reliability" }),
		ask(dailySeries("interactions", { groupBy: "outcome" })),
		ask(dailySeries("rest.ratelimits")),
		daily("shard.ping_ms"),
		daily("memory.rss_bytes"),
		daily("eventloop.p99_ms"),
		ask({ kind: "bursts" }),
	]);

	const window = windowDays(days, now);
	const runs = new Map(window.map((day) => [day, { day, runs: 0, errors: 0, late: 0 }]));
	for (const point of outcomes.points) {
		const day = runs.get(dayOf(point.t));
		if (day === undefined) continue;
		day.runs += point.value;
		if (point.key === "error") day.errors += point.value;
		if (point.key !== null && LATE.has(point.key)) day.late += point.value;
	}

	const limitedBy = new Map<string, number>();
	for (const point of limits.points) limitedBy.set(dayOf(point.t), (limitedBy.get(dayOf(point.t)) ?? 0) + point.value);
	const pingBy = new Map(ping.points.map((point) => [dayOf(point.t), point.value]));
	const gaugeDays = (points: { t: string; value: number | null; max: number | null }[]) => {
		const byDay = new Map(points.map((point) => [dayOf(point.t), point]));
		return window.map((day) => ({ day, value: byDay.get(day)?.value ?? null, max: byDay.get(day)?.max ?? null }));
	};
	const { invalidBudget, identify } = reliability;

	return {
		days,
		daily: [...runs.values()],
		totals: reliability.totals,
		from: reliability.from,
		errorsByCode: tallies(reliability.errorsByCode),
		rateLimits: {
			daily: window.map((day) => ({ day, count: limitedBy.get(day) ?? 0 })),
			routes: reliability.rateLimits
				.slice(0, SHOWN)
				.map((row) => ({ route: row.route ?? "", scope: row.scope ?? "", count: row.count })),
		},
		shards: {
			now: reliability.shards.map((row) => ({ shard: row.shard, pingMs: Math.round(row.ping), stale: row.stale })),
			daily: window.map((day) => {
				const value = pingBy.get(day);
				return { day, pingMs: value === undefined || value === null ? null : Math.round(value) };
			}),
			events: reliability.shardEvents.slice(0, SHOWN).map((row) => ({
				at: row.ts,
				shard: row.shard,
				state: row.state,
				closeCode: row.closeCode,
			})),
		},
		rest: [...reliability.routes].sort((a, b) => b.calls - a.calls || a.route.localeCompare(b.route)).slice(0, SHOWN),
		invalidRequests:
			invalidBudget === null || invalidBudget === undefined
				? null
				: { used: invalidBudget.used, limit: invalidBudget.limit, share: invalidBudget.share },
		sessions:
			identify?.remaining === null || identify?.remaining === undefined || identify.total === null
				? null
				: { remaining: identify.remaining, total: identify.total },
		process: { memory: gaugeDays(memory.points), eventLoop: gaugeDays(eventLoop.points) },
		bursts: bursts.rows.slice(0, SHOWN),
	};
}

/** What the collector says of its own setup and of the bot, which is where a missing step for who ran what shows. */
export async function collectorSetup(client: TestifyClient): Promise<CollectorSetup> {
	const reader = readerFor(client);
	const [overview, meta] = await Promise.all([reader.query({ kind: "overview" }), reader.meta()]);
	const app = overview.app;
	const info = overview.appInfo;
	const added = (counts: Record<string, number>): number => Object.values(counts).reduce((total, n) => total + n, 0);

	return {
		collector: reader.collector ?? "",
		inBot: client.lensTarget.inBot !== null,
		app: {
			name: app?.name ?? "",
			mode: app?.mode ?? (meta.mode === "audit" ? "audit" : "privacy"),
			saltPeriod: app?.saltPeriod ?? "month",
			timezone: app?.timezone ?? "UTC",
			rawRetentionDays: app?.rawRetentionDays ?? meta.rawRetentionDays,
			discordLogin: meta.discordLogin,
		},
		checks: {
			...overview.checklist,
			auditMode: (app?.mode ?? meta.mode) === "audit",
			auditKey: meta.auditKeyConfigured,
			activityKey: reader.readsActivity,
		},
		lastEventAt: overview.lastEventAt,
		servers: overview.servers,
		people: overview.uniqueUsersThisPeriod,
		bot:
			info === null
				? null
				: {
						at: info.ts,
						approxServers: info.approxGuilds,
						approxUserInstalls: info.approxUserInstalls,
						sessionsLeft: info.sessionStartRemaining,
						sessionsTotal: info.sessionStartTotal,
						nodeVersion: info.nodeVersion,
						libraryVersion: info.libVersion,
						sdkVersion: info.sdkVersion,
						release: info.release,
					},
		instances: overview.sdkInstances.map((instance) => ({
			instance: instance.instance,
			at: instance.ts,
			shards: instance.shards,
			queued: instance.queueDepth,
			dropped: added(instance.dropped),
			failedSends: instance.failedFlushes,
			internalErrors: added(instance.internalErrors),
			sdkVersion: instance.sdkVersion,
		})),
	};
}

export async function funnelReport(
	client: TestifyClient,
	query: { days: number; tz: string; steps: string[]; hours: number },
	now = Date.now(),
): Promise<FunnelReport> {
	const ask = askFor(client, query.days, now);
	const funnel = await ask({
		kind: "funnel",
		steps: query.steps.map(commandStep),
		windowHours: query.hours,
		timezone: query.tz,
	});

	return {
		days: query.days,
		hours: query.hours,
		steps: funnel.steps.map((row) => ({ command: row.name, users: row.users, medianSeconds: row.medianSeconds })),
	};
}

export async function retentionReport(
	client: TestifyClient,
	query: { days: number; tz: string; start: string; back?: string | undefined; interval: "day" | "week" },
	now = Date.now(),
): Promise<RetentionReport> {
	const ask = askFor(client, query.days, now);
	const retention = await ask({
		kind: "retention",
		start: commandStep(query.start),
		return: query.back === undefined ? "any" : commandStep(query.back),
		interval: query.interval,
		timezone: query.tz,
	});

	return {
		days: query.days,
		interval: query.interval,
		start: query.start,
		back: query.back ?? null,
		periods: retention.periods,
		cohorts: retention.cohorts,
	};
}
