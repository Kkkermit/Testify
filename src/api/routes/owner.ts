import { type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireOwner } from "@api/middleware/session";
import { parseQuery } from "@api/validate";
import { databaseConnected } from "@database/connection";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getAuditLogConfig, getCounting, getWelcome } from "@database/repositories/settingsRepository";
import { type OwnerGuildRow, type OwnerStats, type Paged, pagination } from "@testify/shared";

export const owner = new Hono<ApiBindings>();

owner.use("*", requireOwner);

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
	const { page, perPage } = parseQuery(context, pagination);
	const client = context.get("client");

	const all = [...client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
	const slice = all.slice((page - 1) * perPage, page * perPage);

	const body: Paged<OwnerGuildRow> = {
		items: await Promise.all(slice.map(toRow)),
		total: all.length,
		page,
		perPage,
	};

	return context.json(body);
});

async function toRow(guild: Guild): Promise<OwnerGuildRow> {
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
	};
}
