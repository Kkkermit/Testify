import { PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { toError } from "@core/errors";
import { recordDashboardView, recordScreenView } from "@database/repositories/usageRepository";
import { screenView } from "@testify/shared";

/** The one write any signed-in manager makes; reading the counts back stays owner-only. */
export const screens = new Hono<ApiBindings>();

screens.use("*", requireAuth);

screens.post("/", async (context) => {
	const { route, guildId } = await parseBody(context, screenView);

	// A failed count must never turn a navigation into an error.
	try {
		await recordScreenView(route);
		if (guildId !== undefined && (await managesGuild(context, guildId))) await recordDashboardView(guildId);
	} catch (error) {
		context.get("client").logger.debug({ err: toError(error), route }, "[ANALYTICS] Could not record a screen view.");
	}

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
