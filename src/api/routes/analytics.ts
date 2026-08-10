import { type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireOwner } from "@api/middleware/session";
import { parseQuery } from "@api/validate";
import { ANALYTICS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { logRing } from "@core/logRing";
import {
	type CommandTally,
	commandTallies,
	dailyTallies,
	type DayTally,
	guildTallies,
	screenTallies,
	surfaceTallies,
	usageTotals,
} from "@database/repositories/usageRepository";
import { runtimeInfo } from "@lib/runtime.util";
import {
	analyticsQuery,
	type CommandUsageRow,
	type GuildUsageRow,
	type LogFeed,
	logQuery,
	type UsageDay,
	type UsageReport,
} from "@testify/shared";

/** The owner console's read-only analytics. Everything here is behind `requireOwner`. */

export const analytics = new Hono<ApiBindings>();

analytics.use("*", requireOwner);

const TOP = 10;

analytics.get("/usage", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	const client = context.get("client");

	const [totals, tallies, guilds, daily, surfaces, screens] = await Promise.all([
		usageTotals(days),
		commandTallies(days),
		guildTallies(days, TOP),
		dailyTallies(days),
		surfaceTallies(days),
		screenTallies(days, TOP),
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
		busiestGuilds: guilds.flatMap(({ guildId, count }) => {
			const guild = client.guilds.cache.get(guildId);
			// A guild the bot has since left still has rows; naming it "unknown" would be noise, so it is dropped.
			return guild === undefined ? [] : [toGuildRow(guild, count)];
		}),
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

/**
 * Ranked over every command the bot has rather than every command that ran, because a command nobody has
 * touched is exactly the answer this list exists to give — and it never appears in the usage rows at all.
 */
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
