import { PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { recordScreenView } from "@lib/bot";
import { screenView } from "@testify/shared";

/** The one analytics write any signed-in manager makes, sent on to Shardlens; reading it back stays owner-only. */
export const screens = new Hono<ApiBindings>();

screens.use("*", requireAuth);

screens.post("/", async (context) => {
	const { route, guildId } = await parseBody(context, screenView);
	const managed = guildId !== undefined && (await managesGuild(context, guildId)) ? guildId : null;

	recordScreenView(context.get("client"), route, managed);
	return context.body(null, 204);
});

/** Only the server's own managers count towards it, so nobody can make a server look busy, an owner included. */
async function managesGuild(context: Context<ApiBindings>, guildId: string): Promise<boolean> {
	const userId = context.get("session")?.userId;
	const guild = context.get("client").guilds.cache.get(guildId);
	if (userId === undefined || guild === undefined) return false;

	const member = await guild.members.fetch(userId).catch(() => null);
	return member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;
}
