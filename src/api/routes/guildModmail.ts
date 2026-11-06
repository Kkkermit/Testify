import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, actorOf, guildOf, readerOf } from "@api/context";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { listOpenConversations } from "@database/repositories/modmailRepository";
import { readerSees } from "@lib/discord";
import { applyModmailSettings, closeModmail, readModmailSettings, toConversationRow } from "@lib/modmail";
import { MODMAIL_LIMITS, type ModmailConversations, modmailParams, modmailSettingsPatch } from "@testify/shared";

/** A server's mod mail: its settings, and the conversations open now, shown only to whoever can see their channel. */
export const guildModmail = new Hono<ApiBindings>();

guildModmail.use("*", requireGuild);

guildModmail.get("/settings", async (context) => context.json(await readModmailSettings(guildOf(context))));

guildModmail.patch("/settings", async (context) => {
	const patch = await parseBody(context, modmailSettingsPatch);

	const settings = await applyModmailSettings(guildOf(context), patch, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "modmail.update",
		summary: patch.enabled === undefined ? "Changed mod mail" : `Turned mod mail ${patch.enabled ? "on" : "off"}`,
		after: settings,
	});

	return context.json(settings);
});

guildModmail.get("/conversations", async (context) => {
	const guild = guildOf(context);
	const settings = await readModmailSettings(guild);
	const channel = settings.channelId === null ? undefined : guild.channels.cache.get(settings.channelId);

	// Discord hides a channel's threads from whoever cannot view it, and so does this list.
	if (channel !== undefined && !readerSees(channel, readerOf(context))) {
		return context.json<ModmailConversations>({ visible: false, items: [] });
	}

	const open = await listOpenConversations(guild.id, MODMAIL_LIMITS.shown);
	return context.json<ModmailConversations>({ visible: true, items: open.map(toConversationRow) });
});

guildModmail.post(
	"/conversations/:conversationId/close",
	requirePermission(PermissionFlagsBits.ManageMessages),
	async (context) => {
		const guild = guildOf(context);
		const { conversationId } = parseParams(context, modmailParams);
		const actor = actorOf(context);

		const closed = await closeModmail(context.get("client"), guild.id, conversationId, actor, "staff");
		await auditChange(context, {
			action: "modmail.close",
			summary: `Closed ${closed.username}'s mod mail`,
		});

		return context.json(toConversationRow(closed));
	},
);
