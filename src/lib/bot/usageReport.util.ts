import { type Filter, type TopQuery } from "@shardlens/client";
import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { LENS_EVENTS, serverKey } from "@lib/bot/shardlens.util";
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
import {
	type AnalyticsProblem,
	type CommandUsageRow,
	type GuildUsageReport,
	type GuildUsageRow,
	isScreenRoute,
	type UsageDay,
	type UsageReport,
} from "@testify/shared";

/** The owner console's usage figures, put together from what Shardlens answers. */

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

function commandRows(client: TestifyClient, tallies: Map<string, Tally>): CommandUsageRow[] {
	return [...tallies]
		.filter(([, tally]) => tally.count > 0)
		.map(([command, tally]) => ({ command, category: categoryOf(client, command), ...tally }))
		.sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));
}

/** Ranked over every command the bot has, because a command nobody has run is exactly what this list is for. */
function leastUsed(client: TestifyClient, tallies: Map<string, Tally>): CommandUsageRow[] {
	return [...client.commands.values()]
		.map((command) => ({
			command: command.name,
			category: command.category,
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

	const [commands, typical, byDay, kinds, byGuild, screens, dashboardByGuild, meta] = await Promise.all([
		ask({ kind: "commands" }),
		ask({ kind: "top", metric: "interactions", groupBy: "command", stat: "p50", limit: ALL_ROWS }),
		ask(dailySeries("interactions", { groupBy: "outcome" })),
		ask(byKind()),
		ask({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL_ROWS }),
		ask(eventProps(LENS_EVENTS.screen, "route")),
		ask(eventProps(LENS_EVENTS.server, "server")),
		reader.meta(),
	]);

	const tallies = new Map<string, Tally>();
	for (const row of commands.rows) {
		if (row.runs === 0) continue;
		tallies.set(row.command, { count: row.runs, failures: Math.round(row.runs * (row.errorRate ?? 0)) });
	}

	const guilds = rowsOf(byGuild.rows.filter((row) => SNOWFLAKE.test(row.key)));
	const dailyRuns = dailyOf(days, now, byDay.points);
	const surfaces = surfacesOf(kinds.rows);
	const typicalMs = rowsOf(typical.rows);
	const ranked = commandRows(client, tallies);

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
		dashboardGuilds: knownGuilds(client, countsOf(dashboardByGuild.values)),
		detailDays: Math.min(days, meta.rawRetentionDays),
		// Only an interaction has Discord waiting on a reply, so a command run only with the prefix has no time here.
		slowest: commands.rows
			.flatMap((row) =>
				row.runs > 0 && row.p95Ms !== null
					? [
							{
								command: row.command,
								category: categoryOf(client, row.command),
								runs: row.runs,
								typicalMs: Math.round(typicalMs.get(row.command) ?? row.p95Ms),
								slowMs: Math.round(row.p95Ms),
							},
						]
					: [],
			)
			.sort((a, b) => b.slowMs - a.slowMs || a.command.localeCompare(b.command))
			.slice(0, TOP),
		screens: screens.values
			.filter((row) => isScreenRoute(row.value))
			.slice(0, TOP)
			.map((row) => ({ route: row.value, count: row.count })),
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

	const [byDay, byCommand, failedByCommand, kinds, dashboard, server, meta] = await Promise.all([
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
	]);

	const failures = rowsOf(failedByCommand.rows);
	const tallies = new Map<string, Tally>(
		[...rowsOf(byCommand.rows)].map(([command, count]) => [command, { count, failures: failures.get(command) ?? 0 }]),
	);
	const commands = commandRows(client, tallies);
	const surfaces = surfacesOf(kinds.rows);
	const runs = surfaces.slash + surfaces.prefix;

	return {
		guild: { ...guildRow(guild, runs), joinedAt: guild.joinedAt.toISOString() },
		days,
		detailDays: Math.min(days, meta.rawRetentionDays),
		runs,
		failures: commands.reduce((sum, row) => sum + row.failures, 0),
		surfaces,
		daily: dailyOf(days, now, byDay.points),
		commands,
		dashboardViews: total(countsOf(dashboard.values)),
		people: server.found ? (server.uniqueUsersThisPeriod ?? null) : null,
		collector: reader.collector ?? "",
	};
}

/** Commands run and dashboard screens opened in every server, for sorting the owner's list of servers. */
export interface GuildActivity {
	commands: Counts;
	dashboard: Counts;
}

export async function guildActivity(client: TestifyClient, days: number, now = Date.now()): Promise<GuildActivity> {
	const ask = askFor(client, days, now);

	const [commands, dashboard] = await Promise.all([
		ask({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL_ROWS }),
		ask(eventProps(LENS_EVENTS.server, "server")),
	]);

	return {
		commands: rowsOf(commands.rows.filter((row) => SNOWFLAKE.test(row.key))),
		dashboard: countsOf(dashboard.values),
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

	const [commands, dashboard] = await Promise.all([
		ask({ kind: "top", metric: "interactions", groupBy: "outcome", filters: serverFilter(guildId) }),
		ask(eventProps(LENS_EVENTS.server, serverKey(guildId))),
	]);

	return { commands: total(rowsOf(commands.rows)), dashboard: total(countsOf(dashboard.values)) };
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
