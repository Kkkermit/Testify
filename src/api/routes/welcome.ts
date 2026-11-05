import { Hono } from "hono";
import { auditSettings } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { badRequest } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { disableWelcome, saveWelcome } from "@database/repositories/welcomeRepository";
import { readWelcomeConfig } from "@lib/settings";
import { type WelcomePatch, welcomePatchSchema } from "@testify/shared";

export const welcome = new Hono<ApiBindings>();

welcome.use("*", requireGuild);

welcome.get("/", async (context) => context.json(await readWelcomeConfig(guildIdOf(context))));

welcome.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, welcomePatchSchema);
	const before = await readWelcomeConfig(guildId);

	if (patch.enabled === false) {
		await disableWelcome(guildId);
	} else {
		const channelId = patch.channelId ?? before.channelId;

		if (channelId === null) throw badRequest("Choose a channel for the greeting before turning it on.");

		await saveWelcome(guildId, {
			channelId,
			message: patch.message ?? before.message,
			style: patch.style ?? before.style,
		});
	}

	const after = await readWelcomeConfig(guildId);
	await auditSettings(context, { action: "welcome.update", summary: summarisePatch(patch), before, after });

	return context.json(after);
});

function summarisePatch(patch: WelcomePatch): string {
	const parts: string[] = [];

	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned welcomes on" : "Turned welcomes off");
	if (patch.channelId !== undefined) parts.push("Changed the welcome channel");
	if (patch.message !== undefined) parts.push("Edited the greeting");
	if (patch.style !== undefined) parts.push(`Greeting sent as a ${patch.style}`);

	return parts.length === 0 ? "Changed the welcome settings" : parts.join(", ");
}
