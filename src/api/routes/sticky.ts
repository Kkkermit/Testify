import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { listSticky, removeSticky, setSticky } from "@database/repositories/settingsRepository";
import { canPostIn } from "@lib/channels.util";
import { STICKY_LIMITS, type StickyList, stickyChannelParam, stickyPut } from "@testify/shared";

export const sticky = new Hono<ApiBindings>();

sticky.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

async function listFor(guild: Guild): Promise<StickyList> {
	const entries = await listSticky(guild.id);

	return {
		limit: STICKY_LIMITS.maxPerGuild,
		entries: entries.map((entry) => ({
			channelId: entry.channelId,
			message: entry.message,
			cap: entry.cap,
			count: entry.count,
			posted: entry.lastMessageId !== null,
			canSend: canPostIn(guild, entry.channelId),
		})),
	};
}

sticky.get("/", async (context) => context.json(await listFor(guildOf(context))));

/**
 * One request replaces the whole entry, keyed by channel, so editing and creating are the same call — which is
 * what the unique index on `{ guildId, channelId }` already enforces underneath.
 */
sticky.put("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, stickyPut);

	const existing = await listSticky(guild.id);
	const isNew = !existing.some((entry) => entry.channelId === body.channelId);

	if (isNew && existing.length >= STICKY_LIMITS.maxPerGuild) {
		throw badRequest(`A server can hold ${String(STICKY_LIMITS.maxPerGuild)} sticky messages.`);
	}

	if (guild.channels.cache.get(body.channelId) === undefined) {
		throw badRequest("That channel is not in this server.");
	}

	await setSticky(guild.id, body.channelId, body.message, body.cap);
	await auditChange(context, {
		action: isNew ? "sticky.create" : "sticky.update",
		summary: `Sticky message in <#${body.channelId}>`,
	});

	return context.json(await listFor(guild));
});

/** The channel is in the path rather than a body: a proxy is free to drop a body on `DELETE`, and does. */
sticky.delete("/:channelId", async (context) => {
	const guild = guildOf(context);
	const { channelId } = parseParams(context, stickyChannelParam);

	if (!(await removeSticky(guild.id, channelId))) {
		throw notFound("sticky_not_found", "There is no sticky in that channel.");
	}

	await auditChange(context, { action: "sticky.delete", summary: `Removed the sticky in <#${channelId}>` });

	return context.json(await listFor(guild));
});
