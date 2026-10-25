import { type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireOwner } from "@api/middleware/session";
import { blacklist } from "@api/routes/blacklist";
import { commandRunner } from "@api/routes/commandRunner";
import { globalCommandToggles } from "@api/routes/commandToggles";
import { parseQuery } from "@api/validate";
import { ANALYTICS } from "@config/constants";
import { databaseConnected } from "@database/connection";
import { getAuditLogConfig } from "@database/repositories/auditLogRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { dashboardTallies, guildTallies } from "@database/repositories/usageRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { ownerGuildQuery, type OwnerGuildRow, type OwnerGuildSort, type OwnerStats, type Paged } from "@testify/shared";

export const owner = new Hono<ApiBindings>();

owner.use("*", requireOwner);

// Behind the same gate as the rest of the console, so a manager cannot reach the bot-wide switches.
owner.route("/commands", globalCommandToggles);
owner.route("/blacklist", blacklist);
owner.route("/runner", commandRunner);

/** The page asks this before drawing anything, because the `isOwner` on `/auth/me` is only as honest as the browser. */
owner.get("/access", (context) => context.body(null, 204));

owner.get("/stats", (context) => {
	const client = context.get("client");

	const body: OwnerStats = {
		guilds: client.guilds.cache.size,
		users: client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
		uptimeMs: Date.now() - client.startedAt,
		memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
		commands: client.commands.size,
		database: databaseConnected() ? "connected" : "disconnected",
	};

	return context.json(body);
});

/** Answers "which of my servers has never configured anything", which is the reason this screen exists. */
owner.get("/guilds", async (context) => {
	const { page, perPage, sort, filter, q = "" } = parseQuery(context, ownerGuildQuery);
	const client = context.get("client");

	const [commands, dashboard] = await Promise.all([
		guildTallies(ANALYTICS.defaultWindowDays),
		dashboardTallies(ANALYTICS.defaultWindowDays),
	]);
	const counts: GuildCounts = {
		commands: new Map(commands.map((row) => [row.guildId, row.count])),
		dashboard: new Map(dashboard.map((row) => [row.guildId, row.count])),
	};

	const all = sortGuilds(
		[...client.guilds.cache.values()].filter(
			(guild) => guildMatches(guild, q) && (filter === "all" || (counts.commands.get(guild.id) ?? 0) === 0),
		),
		sort,
		counts,
	);
	const slice = all.slice((page - 1) * perPage, page * perPage);

	const body: Paged<OwnerGuildRow> = {
		items: await Promise.all(slice.map((guild) => toRow(guild, counts))),
		total: all.length,
		page,
		perPage,
	};

	return context.json(body);
});

export interface GuildCounts {
	commands: Map<string, number>;
	dashboard: Map<string, number>;
}

type Listed = Pick<Guild, "id" | "name" | "memberCount" | "joinedTimestamp">;

/** An ID matches exactly and a name matches anywhere, ignoring case. */
export function guildMatches(guild: Pick<Guild, "id" | "name">, query: string): boolean {
	const wanted = query.trim().toLowerCase();
	if (wanted === "") return true;

	return /^\d{17,20}$/.test(wanted) ? guild.id === wanted : guild.name.toLowerCase().includes(wanted);
}

/** Ties fall back to the name, so a page never reshuffles between two requests for it. */
export function sortGuilds<T extends Listed>(guilds: T[], sort: OwnerGuildSort, counts: GuildCounts): T[] {
	const count = (map: Map<string, number>, guild: T): number => map.get(guild.id) ?? 0;
	const order: Record<OwnerGuildSort, (a: T, b: T) => number> = {
		members: (a, b) => b.memberCount - a.memberCount,
		fewest: (a, b) => a.memberCount - b.memberCount,
		newest: (a, b) => b.joinedTimestamp - a.joinedTimestamp,
		oldest: (a, b) => a.joinedTimestamp - b.joinedTimestamp,
		commands: (a, b) => count(counts.commands, b) - count(counts.commands, a),
		// Among equally quiet servers, the one that has had longest to start using the bot comes first.
		quietest: (a, b) => count(counts.commands, a) - count(counts.commands, b) || a.joinedTimestamp - b.joinedTimestamp,
		dashboard: (a, b) => count(counts.dashboard, b) - count(counts.dashboard, a),
		name: () => 0,
	};

	return [...guilds].sort(
		(a, b) =>
			order[sort](a, b) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id),
	);
}

async function toRow(guild: Guild, counts: GuildCounts): Promise<OwnerGuildRow> {
	const [levels, audit, welcome, counting] = await Promise.all([
		getLevelSettings(guild.id),
		getAuditLogConfig(guild.id),
		getWelcome(guild.id),
		getCounting(guild.id),
	]);

	const configured: string[] = [];
	if (levels !== null && !levels.isDisabled) configured.push("levelling");
	if (audit !== null && audit.enabledLogs.length > 0) configured.push("audit-logging");
	if (welcome !== null && welcome.channelId !== "") configured.push("welcome");
	if (counting !== null) configured.push("counting");

	return {
		id: guild.id,
		name: guild.name,
		iconUrl: guild.iconURL({ size: 64 }),
		memberCount: guild.memberCount,
		joinedAt: guild.joinedAt.toISOString(),
		configured,
		commands: counts.commands.get(guild.id) ?? 0,
		dashboardViews: counts.dashboard.get(guild.id) ?? 0,
	};
}
