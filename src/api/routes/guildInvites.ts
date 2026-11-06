import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyInviteSettings, readInviteOverview } from "@lib/invites";
import { inviteSettingsPatch } from "@testify/shared";

/** A server's invite tracking: whose invites brought members in, and the switch. */
export const guildInvites = new Hono<ApiBindings>();

guildInvites.use("*", requireGuild);

guildInvites.get("/", async (context) => context.json(await readInviteOverview(guildOf(context))));

guildInvites.patch("/", async (context) => {
	const patch = await parseBody(context, inviteSettingsPatch);

	const settings = await applyInviteSettings(guildOf(context), patch, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "invites.update",
		summary:
			patch.enabled === undefined
				? "Changed invite tracking"
				: `Turned invite tracking ${patch.enabled ? "on" : "off"}`,
		after: settings,
	});

	return context.json(settings);
});
