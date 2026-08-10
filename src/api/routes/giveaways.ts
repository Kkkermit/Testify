import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { deleteGiveaway, endGiveaway, listGiveaways, rerollGiveaway, startGiveaway } from "@lib/giveawayActions.util";
import { type GiveawayList, giveawayParams, giveawayStart } from "@testify/shared";

export const giveaways = new Hono<ApiBindings>();

giveaways.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

async function listFor(context: Context<ApiBindings>, guild: Guild): Promise<GiveawayList> {
	return { giveaways: await listGiveaways(context.get("client"), guild.id) };
}

giveaways.get("/", async (context) => context.json(await listFor(context, guildOf(context))));

giveaways.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, giveawayStart);

	if (guild.channels.cache.get(body.channelId) === undefined) {
		throw badRequest("That channel is not in this server.");
	}

	// `hostedBy` is rendered into the giveaway embed, so it has to be a real user the bot can resolve.
	const actorId = context.get("session")?.userId;
	if (actorId === undefined) throw badRequest("Sign in again to start a giveaway.");
	const host = await context.get("client").users.fetch(actorId);

	await startGiveaway(context.get("client"), guild, { ...body, hostedBy: host });
	await auditChange(context, { action: "giveaway.start", summary: `Started a giveaway for ${body.prize}` });

	return context.json(await listFor(context, guild));
});

/**
 * Every action is keyed by the message id from the list, so nobody has to read one out of Discord and retype
 * it — which is what `/giveaway end` still makes them do.
 */
giveaways.post("/:messageId/end", async (context) => {
	const guild = guildOf(context);
	const { messageId } = parseParams(context, giveawayParams);

	await requireInGuild(context, guild, messageId);
	await endGiveaway(context.get("client"), messageId);
	await auditChange(context, { action: "giveaway.end", summary: `Ended giveaway ${messageId}` });

	return context.json(await listFor(context, guild));
});

giveaways.post("/:messageId/reroll", async (context) => {
	const guild = guildOf(context);
	const { messageId } = parseParams(context, giveawayParams);

	await requireInGuild(context, guild, messageId);
	await rerollGiveaway(context.get("client"), messageId);
	await auditChange(context, { action: "giveaway.reroll", summary: `Rerolled giveaway ${messageId}` });

	return context.json(await listFor(context, guild));
});

giveaways.delete("/:messageId", async (context) => {
	const guild = guildOf(context);
	const { messageId } = parseParams(context, giveawayParams);

	await requireInGuild(context, guild, messageId);
	await deleteGiveaway(context.get("client"), messageId);
	await auditChange(context, { action: "giveaway.delete", summary: `Deleted giveaway ${messageId}` });

	return context.json(await listFor(context, guild));
});

/**
 * The id comes from the path, and `discord-giveaways` looks it up globally — so without this check a manager of
 * one server could end a giveaway running in another.
 */
async function requireInGuild(context: Context<ApiBindings>, guild: Guild, messageId: string): Promise<void> {
	const rows = await listGiveaways(context.get("client"), guild.id);
	if (!rows.some((row) => row.messageId === messageId)) {
		throw notFound("giveaway_not_found", "There is no giveaway with that id in this server.");
	}
}
