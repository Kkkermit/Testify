import { type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notInGuild } from "@api/errors";
import { requireOwner } from "@api/middleware/session";
import { parseParams, parseQuery } from "@api/validate";
import { ANALYTICS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { logRing } from "@core/logRing";
import {
	activeMembers,
	type MemberTally,
	memberTallies,
	recentRuns,
	slowestCommands,
} from "@database/repositories/commandRunRepository";
import {
	type CommandTally,
	commandTallies,
	dailyTallies,
	dashboardTallies,
	type DayTally,
	guildTallies,
	screenTallies,
	surfaceTallies,
	usageTotals,
} from "@database/repositories/usageRepository";
import { runtimeInfo } from "@lib/bot";
import {
	analyticsQuery,
	type CommandRunRow,
	type CommandUsageRow,
	guildIdParam,
	guildMembersQuery,
	guildRunsQuery,
	type GuildUsageReport,
	type GuildUsageRow,
	type LogFeed,
	logQuery,
	type MemberUsageRow,
	type Paged,
	RUN_RETENTION_DAYS,
	type UsageDay,
	type UsageReport,
	warningMatches,
} from "@testify/shared";

/** The owner console's read-only analytics. Everything here is behind `requireOwner`. */

export const analytics = new Hono<ApiBindings>();

analytics.use("*", requireOwner);

const TOP = 10;

analytics.get("/usage", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	const client = context.get("client");

	const runDays = Math.min(days, RUN_RETENTION_DAYS);
	const [totals, tallies, guilds, daily, surfaces, screens, dashboard, slowest] = await Promise.all([
		usageTotals(days),
		commandTallies(days),
		guildTallies(days, TOP),
		dailyTallies(days),
		surfaceTallies(days),
		screenTallies(days, TOP),
		dashboardTallies(days, TOP),
		slowestCommands(runDays, TOP),
	]);

	const body: UsageReport = {
		days,
		runs: totals.runs,
		failures: totals.failures,
		activeGuilds: totals.activeGuilds,
		commandsUsed: totals.commandsUsed,
		commandsTotal: client.commands.size,
		surfaces,
		daily: zeroFill(daily, days),
		mostUsed: tallies.slice(0, TOP).map((tally) => toCommandRow(client, tally)),
		leastUsed: leastUsed(client, tallies),
		screens,
		busiestGuilds: knownGuilds(client, guilds),
		dashboardGuilds: knownGuilds(client, dashboard),
		runDays,
		slowest: slowest.map((row) => ({
			...row,
			category: client.commands.get(row.command)?.category ?? "unknown",
		})),
	};

	return context.json(body);
});

analytics.get("/guilds/:guildId", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	const guild = botGuild(context.get("client"), parseParams(context, guildIdParam).guildId);
	const memberDays = Math.min(days, RUN_RETENTION_DAYS);

	const [tallies, daily, surfaces, dashboard, members] = await Promise.all([
		commandTallies(days, 0, undefined, guild.id),
		dailyTallies(days, undefined, guild.id),
		surfaceTallies(days, undefined, guild.id),
		dashboardTallies(days, 0, undefined, guild.id),
		activeMembers(guild.id, memberDays),
	]);
	const runs = tallies.reduce((total, tally) => total + tally.count, 0);

	const body: GuildUsageReport = {
		guild: { ...toGuildRow(guild, runs), joinedAt: guild.joinedAt.toISOString() },
		days,
		memberDays,
		runs,
		failures: tallies.reduce((total, tally) => total + tally.failures, 0),
		surfaces,
		daily: zeroFill(daily, days),
		commands: tallies.map((tally) => toCommandRow(context.get("client"), tally)),
		dashboardViews: dashboard[0]?.count ?? 0,
		members,
	};

	return context.json(body);
});

analytics.get("/guilds/:guildId/members", async (context) => {
	const { days, page, perPage, q = "" } = parseQuery(context, guildMembersQuery);
	const client = context.get("client");
	const guild = botGuild(client, parseParams(context, guildIdParam).guildId);

	const all = (await memberTallies(guild.id, Math.min(days, RUN_RETENTION_DAYS))).filter(
		(member) => q === "" || warningMatches(member, q),
	);

	const body: Paged<MemberUsageRow> = {
		items: all.slice((page - 1) * perPage, page * perPage).map((member) => toMemberRow(client, member)),
		total: all.length,
		page,
		perPage,
	};

	return context.json(body);
});

analytics.get("/guilds/:guildId/runs", async (context) => {
	const { days, page, perPage, userId, command } = parseQuery(context, guildRunsQuery);
	const guild = botGuild(context.get("client"), parseParams(context, guildIdParam).guildId);

	const { items, total } = await recentRuns(
		guild.id,
		Math.min(days, RUN_RETENTION_DAYS),
		{ ...(userId === undefined ? {} : { userId }), ...(command === undefined ? {} : { command }) },
		{ skip: (page - 1) * perPage, limit: perPage },
	);

	const body: Paged<CommandRunRow> = {
		items: items.map((run) => ({
			at: run.at.toISOString(),
			userId: run.userId,
			username: run.username,
			command: run.command,
			subcommand: run.subcommand,
			surface: run.surface,
			failed: run.failed,
			reference: run.reference ?? null,
			durationMs: run.durationMs,
			channelId: run.channelId,
			channelName: run.channelId === null ? null : (guild.channels.cache.get(run.channelId)?.name ?? null),
		})),
		total,
		page,
		perPage,
	};

	return context.json(body);
});

analytics.get("/logs", (context) => {
	const { limit, level, q } = parseQuery(context, logQuery);
	const { lines, matched } = logRing.recent({ limit, minLevel: level, ...(q === undefined ? {} : { search: q }) });

	const body: LogFeed = {
		lines: lines.map((record) => ({
			at: new Date(record.at).toISOString(),
			level: record.level,
			message: record.message,
			context: record.context,
		})),
		buffered: logRing.size,
		capacity: ANALYTICS.logRingCapacity,
		// Nothing below this is ever written, so an empty list at `trace` means the bot is quiet rather than broken.
		loggerLevel: context.get("env").LOG_LEVEL,
		matched,
	};

	return context.json(body);
});

analytics.get("/runtime", (context) => context.json(runtimeInfo(context.get("client"))));

function toCommandRow(client: TestifyClient, tally: CommandTally): CommandUsageRow {
	return {
		command: tally.command,
		category: client.commands.get(tally.command)?.category ?? "unknown",
		count: tally.count,
		failures: tally.failures,
	};
}

/** Ranked over every command the bot has, because a command nobody has run has no usage row. */
function leastUsed(client: TestifyClient, tallies: CommandTally[]): CommandUsageRow[] {
	const counted = new Map(tallies.map((tally) => [tally.command, tally]));

	return [...client.commands.values()]
		.map((command) => {
			const tally = counted.get(command.name);
			return {
				command: command.name,
				category: command.category,
				count: tally?.count ?? 0,
				failures: tally?.failures ?? 0,
			};
		})
		.sort((a, b) => a.count - b.count || a.command.localeCompare(b.command))
		.slice(0, TOP);
}

function botGuild(client: TestifyClient, guildId: string): Guild {
	const guild = client.guilds.cache.get(guildId);
	if (guild === undefined) throw notInGuild();
	return guild;
}

/** A guild the bot has since left still has rows; naming it "unknown" would be noise, so it is dropped. */
function knownGuilds(client: TestifyClient, tallies: { guildId: string; count: number }[]): GuildUsageRow[] {
	return tallies.flatMap(({ guildId, count }) => {
		const guild = client.guilds.cache.get(guildId);
		return guild === undefined ? [] : [toGuildRow(guild, count)];
	});
}

function toMemberRow(client: TestifyClient, member: MemberTally): MemberUsageRow {
	return {
		userId: member.userId,
		username: member.username,
		avatarUrl: client.users.cache.get(member.userId)?.displayAvatarURL({ size: 64 }) ?? null,
		runs: member.runs,
		failures: member.failures,
		prefix: member.prefix,
		commandCount: member.commands.length,
		topCommands: member.commands.slice(0, 3),
		lastAt: member.lastAt.toISOString(),
	};
}

function toGuildRow(guild: Guild, count: number): GuildUsageRow {
	return {
		guildId: guild.id,
		name: guild.name,
		iconUrl: guild.iconURL({ size: 64 }),
		memberCount: guild.memberCount,
		count,
	};
}

/** A day with no activity has no row, and a chart with holes in it reads as missing data rather than a quiet day. */
export function zeroFill(rows: DayTally[], days: number, now: Date = new Date()): UsageDay[] {
	const found = new Map(rows.map((row) => [row.day, row]));

	return Array.from({ length: days }, (_, index) => {
		const at = new Date(now.getTime() - (days - 1 - index) * 24 * 60 * 60 * 1000);
		const day = at.toISOString().slice(0, 10);
		const row = found.get(day);

		return { day, count: row?.count ?? 0, failures: row?.failures ?? 0 };
	});
}
