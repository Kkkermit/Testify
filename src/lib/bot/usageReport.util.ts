import { type Guild } from "discord.js";
import { type ZodType } from "zod";
import { type TestifyClient } from "@core/client";
import { LENS_EVENTS, serverKey } from "@lib/bot/shardlens.util";
import {
	AnalyticsUnavailable,
	commandsAnswer,
	propsAnswer,
	rangeOf,
	readerFor,
	seriesAnswer,
	serverAnswer,
	type Spec,
	topAnswer,
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
/** As many rows as the collector hands back for one ranking. */
const ALL = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const FAILED = ["error", "timeout", "no_response"];
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

/** Every day in the window, oldest first and in UTC, so a quiet day is a zero rather than a hole in the chart. */
export function windowDays(days: number, now = Date.now()): string[] {
	return Array.from({ length: days }, (_, index) =>
		new Date(now - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
	);
}

interface Point {
	t: string;
	key: string | null;
	value: number;
}

/** `outcome` series count every point and fail all but `ok`; a series with no key is all one or the other. */
export function dailyOf(days: number, now: number, counted: Point[][], failed: Point[][]): UsageDay[] {
	const byDay = new Map<string, Tally>(windowDays(days, now).map((day) => [day, { count: 0, failures: 0 }]));
	const at = (point: Point): Tally | undefined => byDay.get(point.t.slice(0, 10));

	for (const point of counted.flat()) {
		const day = at(point);
		if (day === undefined) continue;
		day.count += point.value;
		if (point.key !== null && point.key !== "ok") day.failures += point.value;
	}
	for (const point of failed.flat()) {
		const day = at(point);
		if (day !== undefined) day.failures += point.value;
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

const daily = (metric: string, extra: Spec = {}): Spec => ({
	kind: "series",
	metric,
	interval: "day",
	timezone: "UTC",
	...extra,
});

const custom = (name: string): Spec => daily("custom", { name });

const props = (name: string, prop: string): Spec => ({ kind: "eventProps", name, prop });

const serverFilter = (guildId: string): Spec[] => [{ field: "guild", op: "eq", value: guildId }];

export async function usageReport(client: TestifyClient, days: number, now = Date.now()): Promise<UsageReport> {
	const reader = readerFor(client);
	const range = rangeOf(days, now);
	const ask = <T>(spec: Spec, schema: ZodType<T>): Promise<T> => reader.query({ ...spec, range }, schema);

	const [
		commands,
		typical,
		slashDays,
		prefixDays,
		prefixFailedDays,
		prefixByCommand,
		prefixFailedByCommand,
		slashByGuild,
		prefixByGuild,
		screens,
		dashboardByGuild,
		meta,
	] = await Promise.all([
		ask({ kind: "commands" }, commandsAnswer),
		ask({ kind: "top", metric: "interactions", groupBy: "command", stat: "p50", limit: ALL }, topAnswer),
		ask(daily("interactions", { groupBy: "outcome" }), seriesAnswer),
		ask(custom(LENS_EVENTS.prefix), seriesAnswer),
		ask(custom(LENS_EVENTS.prefixFailed), seriesAnswer),
		ask(props(LENS_EVENTS.prefix, "command"), propsAnswer),
		ask(props(LENS_EVENTS.prefixFailed, "command"), propsAnswer),
		ask({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL }, topAnswer),
		ask(props(LENS_EVENTS.prefix, "server"), propsAnswer),
		ask(props(LENS_EVENTS.screen, "route"), propsAnswer),
		ask(props(LENS_EVENTS.server, "server"), propsAnswer),
		reader.meta(),
	]);

	const tallies = new Map<string, Tally>();
	const tallyOf = (command: string): Tally => {
		let tally = tallies.get(command);
		if (tally === undefined) {
			tally = { count: 0, failures: 0 };
			tallies.set(command, tally);
		}
		return tally;
	};
	for (const row of commands.rows) {
		if (row.runs === 0) continue;
		const tally = tallyOf(row.command);
		tally.count += row.runs;
		tally.failures += Math.round(row.runs * (row.errorRate ?? 0));
	}
	for (const [command, count] of countsOf(prefixByCommand.values)) tallyOf(command).count += count;
	for (const [command, count] of countsOf(prefixFailedByCommand.values)) tallyOf(command).failures += count;

	const byGuild = rowsOf(slashByGuild.rows.filter((row) => SNOWFLAKE.test(row.key)));
	for (const [guildId, count] of countsOf(prefixByGuild.values)) add(byGuild, guildId, count);

	const dailyRuns = dailyOf(days, now, [slashDays.points, prefixDays.points], [prefixFailedDays.points]);
	const slash = slashDays.points.reduce((sum, point) => sum + point.value, 0);
	const prefix = prefixDays.points.reduce((sum, point) => sum + point.value, 0);
	const typicalMs = rowsOf(typical.rows);
	const ranked = commandRows(client, tallies);

	return {
		days,
		runs: slash + prefix,
		failures: dailyRuns.reduce((sum, day) => sum + day.failures, 0),
		activeGuilds: [...byGuild.values()].filter((count) => count > 0).length,
		commandsUsed: ranked.length,
		commandsTotal: client.commands.size,
		surfaces: { slash, prefix },
		daily: dailyRuns,
		mostUsed: ranked.slice(0, TOP),
		leastUsed: leastUsed(client, tallies),
		busiestGuilds: knownGuilds(client, byGuild),
		dashboardGuilds: knownGuilds(client, countsOf(dashboardByGuild.values)),
		detailDays: Math.min(days, meta.rawRetentionDays),
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
	const range = rangeOf(days, now);
	const ask = <T>(spec: Spec, schema: ZodType<T>): Promise<T> => reader.query({ ...spec, range }, schema);
	const here = serverFilter(guild.id);
	const key = serverKey(guild.id);

	const [slashDays, slashByCommand, failedByCommand, prefixByCommand, prefixFailedByCommand, dashboard, server, meta] =
		await Promise.all([
			ask(daily("interactions", { groupBy: "outcome", filters: here }), seriesAnswer),
			ask({ kind: "top", metric: "interactions", groupBy: "command", filters: here, limit: ALL }, topAnswer),
			ask(
				{
					kind: "top",
					metric: "interactions",
					groupBy: "command",
					filters: [...here, { field: "outcome", op: "in", value: FAILED }],
					limit: ALL,
				},
				topAnswer,
			),
			ask(props(LENS_EVENTS.prefix, key), propsAnswer),
			ask(props(LENS_EVENTS.prefixFailed, key), propsAnswer),
			ask(props(LENS_EVENTS.server, key), propsAnswer),
			reader.query({ kind: "server", guild: guild.id }, serverAnswer),
			reader.meta(),
		]);

	const tallies = new Map<string, Tally>();
	const merge = (counts: Counts, field: keyof Tally): void => {
		for (const [command, count] of counts) {
			const tally = tallies.get(command) ?? { count: 0, failures: 0 };
			tally[field] += count;
			tallies.set(command, tally);
		}
	};
	const slash = rowsOf(slashByCommand.rows);
	const prefix = countsOf(prefixByCommand.values);
	merge(slash, "count");
	merge(rowsOf(failedByCommand.rows), "failures");
	merge(prefix, "count");
	merge(countsOf(prefixFailedByCommand.values), "failures");

	const commands = commandRows(client, tallies);
	const runs = total(slash) + total(prefix);

	return {
		guild: { ...guildRow(guild, runs), joinedAt: guild.joinedAt.toISOString() },
		days,
		detailDays: Math.min(days, meta.rawRetentionDays),
		runs,
		failures: commands.reduce((sum, row) => sum + row.failures, 0),
		surfaces: { slash: total(slash), prefix: total(prefix) },
		daily: dailyOf(days, now, [slashDays.points], []),
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
	const reader = readerFor(client);
	const range = rangeOf(days, now);

	const [slash, prefix, dashboard] = await Promise.all([
		reader.query({ kind: "top", metric: "interactions", groupBy: "guild", limit: ALL, range }, topAnswer),
		reader.query({ ...props(LENS_EVENTS.prefix, "server"), range }, propsAnswer),
		reader.query({ ...props(LENS_EVENTS.server, "server"), range }, propsAnswer),
	]);

	const commands = rowsOf(slash.rows.filter((row) => SNOWFLAKE.test(row.key)));
	for (const [guildId, count] of countsOf(prefix.values)) add(commands, guildId, count);
	return { commands, dashboard: countsOf(dashboard.values) };
}

/** One server's figures, read by its own key, so a quiet server is not lost below the top of a ranking. */
export async function oneGuildActivity(
	client: TestifyClient,
	guildId: string,
	days: number,
	now = Date.now(),
): Promise<{ commands: number; dashboard: number }> {
	const reader = readerFor(client);
	const range = rangeOf(days, now);
	const key = serverKey(guildId);

	const [slash, prefix, dashboard] = await Promise.all([
		reader.query(
			{ kind: "top", metric: "interactions", groupBy: "outcome", filters: serverFilter(guildId), range },
			topAnswer,
		),
		reader.query({ ...props(LENS_EVENTS.prefix, key), range }, propsAnswer),
		reader.query({ ...props(LENS_EVENTS.server, key), range }, propsAnswer),
	]);

	return {
		commands: total(rowsOf(slash.rows)) + total(countsOf(prefix.values)),
		dashboard: total(countsOf(dashboard.values)),
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
