import { PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, actorOf, guildOf, readerOf } from "@api/context";
import { forbidden } from "@api/errors";
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

/** Discord hides a channel's threads from whoever cannot view it, and so does every conversation route. */
async function seesConversations(context: Context<ApiBindings>): Promise<boolean> {
	const guild = guildOf(context);
	const { channelId } = await readModmailSettings(guild);
	const channel = channelId === null ? undefined : guild.channels.cache.get(channelId);
	return channel === undefined || readerSees(channel, readerOf(context));
}

guildModmail.get("/conversations", async (context) => {
	if (!(await seesConversations(context))) return context.json<ModmailConversations>({ visible: false, items: [] });

	const open = await listOpenConversations(guildOf(context).id, MODMAIL_LIMITS.shown);
	return context.json<ModmailConversations>({ visible: true, items: open.map(toConversationRow) });
});

guildModmail.post(
	"/conversations/:conversationId/close",
	requirePermission(PermissionFlagsBits.ManageMessages),
	async (context) => {
		const guild = guildOf(context);
		const { conversationId } = parseParams(context, modmailParams);
		const actor = actorOf(context);
		if (!(await seesConversations(context))) {
			throw forbidden("missing_permission", "You need to be able to see the mod mail channel to close a conversation.");
		}

		const closed = await closeModmail(context.get("client"), guild.id, conversationId, actor, "staff");
		await auditChange(context, {
			action: "modmail.close",
			summary: `Closed ${closed.username}'s mod mail`,
		});

		return context.json(toConversationRow(closed));
	},
);
