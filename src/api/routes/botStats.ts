import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { notFound, notInGuild } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { postBotStats, readBotStats, removeBotStats } from "@lib/info";
import { botStatsPost } from "@testify/shared";

export const botStats = new Hono<ApiBindings>();

botStats.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	return guild;
}

botStats.get("/", async (context) => context.json(await readBotStats(guildOf(context).id)));

/** Posting is the whole setting, so choosing a channel and sending the message are one request. */
botStats.put("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, botStatsPost);

	const settings = await postBotStats(
		context.get("client"),
		guild,
		body.channelId,
		context.get("session")?.userId ?? "",
	);
	await auditChange(context, {
		action: "bot-stats.post",
		summary: `Posted the bot statistics message in <#${body.channelId}>`,
	});

	return context.json(settings);
});

botStats.delete("/", async (context) => {
	const guild = guildOf(context);

	if (!(await removeBotStats(context.get("client"), guild.id))) {
		throw notFound("bot_stats_not_found", "There is no statistics message here.");
	}

	await auditChange(context, { action: "bot-stats.remove", summary: "Removed the bot statistics message" });

	return context.json(await readBotStats(guild.id));
});
