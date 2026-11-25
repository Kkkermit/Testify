import { type Filter, type TopQuery } from "@shardlens/client";
import { type Guild, PermissionsBitField } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import {
	earlierDashboardViews,
	earlierScreenViews,
	earlierUses,
	type EarlierTally,
	type EarlierUses,
	NO_EARLIER_USES,
} from "@database/repositories/earlierUsageRepository";
import { LENS_EVENTS, ownHandlerName, serverKey } from "@lib/bot/shardlens.util";
import {
	ALL_ROWS,
	AnalyticsUnavailable,
	askFor,
	dailySeries,
	eventProps,
	FAILED_OUTCOMES,
	readerFor,
	serverFilter,
	windowDays,
} from "@lib/bot/shardlensReader.util";
import { formsByHandler, tallies } from "@lib/bot/usageSections.util";
import {
	type AnalyticsProblem,
	type CommandReport,
	type CommandUsageRow,
	type GuildProfile,
	type GuildUsageReport,
	type GuildUsageRow,
	isScreenRoute,
	type UsageDay,
	type UsageReport,
} from "@testify/shared";

/** The owner console's usage figures, put together from what Shardlens answers and what the bot counted before it. */

const TOP = 10;
const PREFIX_KIND = "message_command";
const SNOWFLAKE = /^\d{17,20}$/;

type Counts = Map<string, number>;

interface Tally {
	count: number;
	failures: number;
}

function add(into: Counts, key: string, count: number): void {
	into.set(key, (into.get(key) ?? 0) + count);
}

function countsOf(values: { value: string; count: number }[]): Counts {
	const counts: Counts = new Map();
	for (const { value, count } of values) add(counts, value, count);
	return counts;
}

function rowsOf(rows: { key: string; value: number | null }[]): Counts {
	const counts: Counts = new Map();
	for (const { key, value } of rows) add(counts, key, value ?? 0);
	return counts;
}

const total = (counts: Counts): number => [...counts.values()].reduce((sum, count) => sum + count, 0);

/** The counts from before Shardlens are history, so one that cannot be read costs its share of a figure, not the page. */
async function earlier<T>(client: TestifyClient, work: Promise<T>, none: T): Promise<T> {
	try {
		return await work;
	} catch (error) {
		client.logger.debug({ err: toError(error) }, "[ANALYTICS] The counts from before Shardlens could not be read.");
		return none;
	}
}

/** The first day of the window, as the bot keyed its own counts. */
const firstDay = (days: number, now: number): string => windowDays(days, now)[0] ?? "";

function addTallies(into: Map<string, Tally>, rows: EarlierTally[]): void {
	for (const row of rows) {
		const tally = into.get(row.key) ?? { count: 0, failures: 0 };
		into.set(row.key, { count: tally.count + row.count, failures: tally.failures + row.failures });
	}
}

/** Servers only: a run outside one was counted under a key that is not a server's id. */
function addGuildCounts(into: Counts, rows: EarlierTally[]): Counts {
	for (const row of rows) if (SNOWFLAKE.test(row.key)) add(into, row.key, row.count);
	return into;
}

function withEarlierDays(days: UsageDay[], rows: EarlierTally[]): UsageDay[] {
	const byDay = new Map(rows.map((row) => [row.key, row]));
	return days.map((day) => {
		const before = byDay.get(day.day);
		if (before === undefined) return day;
		return { day: day.day, count: day.count + before.count, failures: day.failures + before.failures };
	});
}

function withEarlierSurfaces(
	surfaces: { slash: number; prefix: number },
	rows: EarlierTally[],
): { slash: number; prefix: number } {
	const count = (surface: string): number => rows.find((row) => row.key === surface)?.count ?? 0;
	return { slash: surfaces.slash + count("slash"), prefix: surfaces.prefix + count("prefix") };
}

const countedIn = (uses: EarlierUses): number => uses.byDay.reduce((sum, day) => sum + day.count, 0);

interface Point {
	t: string;
	key: string | null;
	value: number;
}

/** An `outcome` series counts every point, and every outcome but `ok` is a failure. */
export function dailyOf(days: number, now: number, points: Point[]): UsageDay[] {
	const byDay = new Map<string, Tally>(windowDays(days, now).map((day) => [day, { count: 0, failures: 0 }]));

	for (const point of points) {
		const day = byDay.get(point.t.slice(0, 10));
		if (day === undefined) continue;
		day.count += point.value;
		if (point.key !== "ok") day.failures += point.value;
	}

	return [...byDay].map(([day, { count, failures }]) => ({ day, count, failures }));
}

/** A right-click action is filed under the command it belongs to. */
function categoryOf(client: TestifyClient, name: string): string {
	const command = client.commands.get(name) ?? client.commands.get(client.contextMenus.get(name)?.switchedBy ?? "");
	return command?.category ?? "unknown";
}

const isMenu = (client: TestifyClient, name: string): boolean => client.contextMenus.has(name);

function commandRows(client: TestifyClient, tallies: Map<string, Tally>): CommandUsageRow[] {
	return [...tallies]
		.filter(([, tally]) => tally.count > 0)
		.map(([command, tally]) => ({
			command,
			category: categoryOf(client, command),
			menu: isMenu(client, command),
			...tally,
		}))
		.sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));
}

/** Ranked over every command the bot has, because a command nobody has run is exactly what this list is for. */
function leastUsed(client: TestifyClient, tallies: Map<string, Tally>): CommandUsageRow[] {
	return [...client.commands.values()]
		.map((command) => ({
			command: command.name,
			category: command.category,
			menu: false,
			count: tallies.get(command.name)?.count ?? 0,
			failures: tallies.get(command.name)?.failures ?? 0,
		}))
		.sort((a, b) => a.count - b.count || a.command.localeCompare(b.command))
		.slice(0, TOP);
}

function guildRow(guild: Guild, count: number): GuildUsageRow {
	return {
		guildId: guild.id,
		name: guild.name,
		iconUrl: guild.iconURL({ size: 64 }),
		memberCount: guild.memberCount,
		count,
	};
}

/** A server the bot has since left still has figures, and naming it "unknown" would be noise. */
function knownGuilds(client: TestifyClient, counts: Counts): GuildUsageRow[] {
	return [...counts]
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.flatMap(([guildId, count]) => {
			const guild = client.guilds.cache.get(guildId);
			return guild === undefined ? [] : [guildRow(guild, count)];
		})
		.slice(0, TOP);
}

/** Runs by what started them, which is how slash commands and right-click actions are told from prefix commands. */
const byKind = (filters: Filter[] = []): Omit<TopQuery, "range"> => ({
	kind: "top",
	metric: "interactions",
	groupBy: "kind",
	filters,
	limit: ALL_ROWS,
});

/** The SDK's `message_command` is a prefix run; every other kind of command is an interaction. */
function surfacesOf(rows: { key: string; value: number | null }[]): { slash: number; prefix: number } {
	let slash = 0;
	let prefix = 0;
	for (const { key, value } of rows) {
		if (key === PREFIX_KIND) prefix += value ?? 0;
		else slash += value ?? 0;
	}
	return { slash, prefix };
}

export async function usageReport(client: TestifyClient, days: number, now = Date.now()): Promise<UsageReport> {
	const reader = readerFor(client);
	const ask = askFor(client, days, now);

	const since = firstDay(days, now);

	const [
		commands,
		typical,
		byDay,
		kinds,
		byGuild,
		screens,
		dashboardByGuild,
		meta,
		before,
		screensBefore,
		viewsBefore,
	] = await Promise.all([
		ask({ kind: "commands" }),
		ask({ kind: "top", metric: "interactions", groupBy: "command", stat: "p50", limit: ALL_ROWS }),
		ask(dailySeries("interactions", { groupBy: "outcome" })),
		ask(byKind()),
		ask({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL_ROWS }),
		ask(eventProps(LENS_EVENTS.screen, "route")),
		ask(eventProps(LENS_EVENTS.server, "server")),
		reader.meta(),
		earlier(client, earlierUses(since), NO_EARLIER_USES),
		earlier(client, earlierScreenViews(since), []),
		earlier(client, earlierDashboardViews(since), []),
	]);

	const tallies = new Map<string, Tally>();
	for (const row of commands.rows) {
		if (row.runs === 0) continue;
		tallies.set(row.command, { count: row.runs, failures: Math.round(row.runs * (row.errorRate ?? 0)) });
	}
	addTallies(tallies, before.byCommand);

	const guilds = addGuildCounts(rowsOf(byGuild.rows.filter((row) => SNOWFLAKE.test(row.key))), before.byGuild);
	const dailyRuns = withEarlierDays(dailyOf(days, now, byDay.points), before.byDay);
	const surfaces = withEarlierSurfaces(surfacesOf(kinds.rows), before.bySurface);
	const typicalMs = rowsOf(typical.rows);
	const ranked = commandRows(client, tallies);
	const screenCounts = countsOf(screens.values);
	for (const row of screensBefore) add(screenCounts, row.key, row.count);

	return {
		days,
		runs: surfaces.slash + surfaces.prefix,
		failures: dailyRuns.reduce((sum, day) => sum + day.failures, 0),
		activeGuilds: [...guilds.values()].filter((count) => count > 0).length,
		commandsUsed: ranked.length,
		commandsTotal: client.commands.size,
		surfaces,
		daily: dailyRuns,
		mostUsed: ranked.slice(0, TOP),
		leastUsed: leastUsed(client, tallies),
		busiestGuilds: knownGuilds(client, guilds),
		dashboardGuilds: knownGuilds(client, addGuildCounts(countsOf(dashboardByGuild.values), viewsBefore)),
		detailDays: Math.min(days, meta.rawRetentionDays),
		countedBefore: countedIn(before),
		// Only an interaction has Discord waiting on a reply, so a command run only with the prefix has no time here.
		slowest: commands.rows
			.flatMap((row) =>
				row.runs > 0 && row.p95Ms !== null
					? [
							{
								command: row.command,
								category: categoryOf(client, row.command),
								menu: isMenu(client, row.command),
								runs: row.runs,
								typicalMs: Math.round(typicalMs.get(row.command) ?? row.p95Ms),
								slowMs: Math.round(row.p95Ms),
							},
						]
					: [],
			)
			.sort((a, b) => b.slowMs - a.slowMs || a.command.localeCompare(b.command))
			.slice(0, TOP),
		screens: [...screenCounts]
			.filter(([route, count]) => isScreenRoute(route) && count > 0)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, TOP)
			.map(([route, count]) => ({ route, count })),
		collector: reader.collector ?? "",
	};
}

export async function guildUsageReport(
	client: TestifyClient,
	guild: Guild,
	days: number,
	now = Date.now(),
): Promise<GuildUsageReport> {
	const reader = readerFor(client);
	const ask = askFor(client, days, now);
	const here = serverFilter(guild.id);
	const since = firstDay(days, now);

	const [byDay, byCommand, failedByCommand, kinds, dashboard, server, meta, before, viewsBefore] = await Promise.all([
		ask(dailySeries("interactions", { groupBy: "outcome", filters: here })),
		ask({ kind: "top", metric: "interactions", groupBy: "command", filters: here, limit: ALL_ROWS }),
		ask({
			kind: "top",
			metric: "interactions",
			groupBy: "command",
			filters: [...here, { field: "outcome", op: "in", value: FAILED_OUTCOMES }],
			limit: ALL_ROWS,
		}),
		ask(byKind(here)),
		ask(eventProps(LENS_EVENTS.server, serverKey(guild.id))),
		reader.query({ kind: "server", guild: guild.id }),
		reader.meta(),
		earlier(client, earlierUses(since, guild.id), NO_EARLIER_USES),
		earlier(client, earlierDashboardViews(since, guild.id), []),
	]);

	const failures = rowsOf(failedByCommand.rows);
	const tallies = new Map<string, Tally>(
		[...rowsOf(byCommand.rows)].map(([command, count]) => [command, { count, failures: failures.get(command) ?? 0 }]),
	);
	addTallies(tallies, before.byCommand);
	const commands = commandRows(client, tallies);
	const surfaces = withEarlierSurfaces(surfacesOf(kinds.rows), before.bySurface);
	const runs = surfaces.slash + surfaces.prefix;

	return {
		guild: { ...guildRow(guild, runs), joinedAt: guild.joinedAt.toISOString() },
		days,
		detailDays: Math.min(days, meta.rawRetentionDays),
		countedBefore: countedIn(before),
		runs,
		failures: commands.reduce((sum, row) => sum + row.failures, 0),
		surfaces,
		daily: withEarlierDays(dailyOf(days, now, byDay.points), before.byDay),
		commands,
		dashboardViews: total(countsOf(dashboard.values)) + viewsBefore.reduce((sum, row) => sum + row.count, 0),
		people: server.found ? (server.uniqueUsersThisPeriod ?? null) : null,
		profile: server.found ? profileOf(server) : null,
		collector: reader.collector ?? "",
	};
}

/** The collector's own record of a server, with the permissions it lacks named as Discord names them. */
function profileOf(server: {
	profile?: { sizeAtJoin: number | null; firstCommandAt: string | null; lastCommandAt: string | null } | undefined;
	events: { ts: string; kind: GuildProfile["history"][number]["kind"]; detectedAtStartup: boolean }[];
	missingPermissions?: string | null | undefined;
}): GuildProfile {
	const bits = server.missingPermissions;
	return {
		sizeAtJoin: server.profile?.sizeAtJoin ?? null,
		firstCommandAt: server.profile?.firstCommandAt ?? null,
		lastCommandAt: server.profile?.lastCommandAt ?? null,
		missingPermissions: bits === null || bits === undefined ? [] : new PermissionsBitField(BigInt(bits)).toArray(),
		history: server.events
			.slice(0, TOP)
			.map((event) => ({ at: event.ts, kind: event.kind, atStartup: event.detectedAtStartup })),
	};
}

/** One command in depth: every breakdown the collector keeps, read from its raw events. */
export async function commandReport(
	client: TestifyClient,
	name: string,
	days: number,
	now = Date.now(),
): Promise<CommandReport> {
	const reader = readerFor(client);
	const ask = askFor(client, days, now);
	const [detail, byDay] = await Promise.all([
		ask({ kind: "command", name }),
		ask(dailySeries("interactions", { groupBy: "outcome", filters: [{ field: "command", op: "eq", value: name }] })),
	]);
	const { totals } = detail;

	return {
		command: name,
		category: categoryOf(client, name),
		days,
		from: detail.from,
		daily: dailyOf(days, now, byDay.points),
		totals: {
			runs: totals.runs,
			ok: totals.ok,
			errors: totals.error,
			late: totals.timeout,
			noResponse: totals.noResponse,
			deferRate: totals.deferRate,
			ephemeralRate: totals.ephemeralRate,
			over3sRate: totals.over3sRate,
			handlerP95Ms: totals.handlerP95Ms,
			firstAt: totals.firstSeen,
			lastAt: totals.lastSeen,
		},
		latency: detail.latencyHistogram,
		kinds: tallies(detail.kinds),
		subcommands: tallies(detail.subcommands),
		options: tallies(detail.options),
		optionValues: detail.optionValues.slice(0, TOP * 2),
		tiers: tallies(detail.memberTiers),
		installs: tallies(detail.installs),
		contexts: tallies(detail.contexts),
		channelTypes: tallies(detail.channelTypes),
		locales: tallies(detail.locales),
		servers: knownGuilds(client, rowsOf(detail.topServers.filter((row) => SNOWFLAKE.test(row.key)))),
		components: componentsOf(client, detail.components),
		forms: formsByHandler(client, detail.modals),
		collector: reader.collector ?? "",
	};
}

/** Only the bot's own handlers, by handler and action, so nothing a handler packed into an ID reaches the page. */
function componentsOf(
	client: TestifyClient,
	rows: { key: string | null; kind: string; value: number }[],
): CommandReport["components"] {
	const counts = new Map<string, { handler: string; kind: string; count: number }>();
	for (const { key, kind, value } of rows) {
		const handler = ownHandlerName(client, key);
		if (handler === null) continue;
		const row = counts.get(`${kind} ${handler}`) ?? { handler, kind, count: 0 };
		row.count += value;
		counts.set(`${kind} ${handler}`, row);
	}
	return [...counts.values()].sort((a, b) => b.count - a.count || a.handler.localeCompare(b.handler)).slice(0, TOP);
}

/** Commands run and dashboard screens opened in every server, for sorting the owner's list of servers. */
export interface GuildActivity {
	commands: Counts;
	dashboard: Counts;
}

export async function guildActivity(client: TestifyClient, days: number, now = Date.now()): Promise<GuildActivity> {
	const ask = askFor(client, days, now);
	const since = firstDay(days, now);

	const [commands, dashboard, before, viewsBefore] = await Promise.all([
		ask({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL_ROWS }),
		ask(eventProps(LENS_EVENTS.server, "server")),
		earlier(client, earlierUses(since), NO_EARLIER_USES),
		earlier(client, earlierDashboardViews(since), []),
	]);

	return {
		commands: addGuildCounts(rowsOf(commands.rows.filter((row) => SNOWFLAKE.test(row.key))), before.byGuild),
		dashboard: addGuildCounts(countsOf(dashboard.values), viewsBefore),
	};
}

/** One server's figures, read by its own key, so a quiet server is not lost below the top of a ranking. */
export async function oneGuildActivity(
	client: TestifyClient,
	guildId: string,
	days: number,
	now = Date.now(),
): Promise<{ commands: number; dashboard: number }> {
	const ask = askFor(client, days, now);
	const since = firstDay(days, now);

	const [commands, dashboard, before, viewsBefore] = await Promise.all([
		ask({ kind: "top", metric: "interactions", groupBy: "outcome", filters: serverFilter(guildId) }),
		ask(eventProps(LENS_EVENTS.server, serverKey(guildId))),
		earlier(client, earlierUses(since, guildId), NO_EARLIER_USES),
		earlier(client, earlierDashboardViews(since, guildId), []),
	]);

	return {
		commands: total(rowsOf(commands.rows)) + countedIn(before),
		dashboard: total(countsOf(dashboard.values)) + viewsBefore.reduce((sum, row) => sum + row.count, 0),
	};
}

/** For a figure that is a nicety on its page: the page still loads, and says why the number is missing. */
export async function orUnavailable<T>(
	work: Promise<T>,
): Promise<{ value: T | null; problem: AnalyticsProblem | null }> {
	try {
		return { value: await work, problem: null };
	} catch (error) {
		if (error instanceof AnalyticsUnavailable) return { value: null, problem: error.problem };
		throw error;
	}
}
