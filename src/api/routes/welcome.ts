import { Hono } from "hono";
import { auditSettings } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { badRequest } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { disableWelcome, getWelcome, saveWelcome } from "@database/repositories/welcomeRepository";
import { normaliseWelcome } from "@lib/welcome";
import {
	DEFAULT_WELCOME_MESSAGE,
	type WelcomeConfigResponse,
	type WelcomePatch,
	welcomePatchSchema,
} from "@testify/shared";

export const welcome = new Hono<ApiBindings>();

welcome.use("*", requireGuild);

/**
 * No record means off, so an absent one becomes a disabled config with defaults; `normaliseWelcome` migrates old
 * records.
 */
async function configOf(guildId: string): Promise<WelcomeConfigResponse> {
	const stored = normaliseWelcome(await getWelcome(guildId));

	if (stored === null) {
		return {
			enabled: false,
			channelId: null,
			message: DEFAULT_WELCOME_MESSAGE,
			style: "card",
			hasBackground: false,
		};
	}

	return { enabled: true, ...stored };
}

welcome.get("/", async (context) => context.json(await configOf(guildIdOf(context))));

welcome.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, welcomePatchSchema);
	const before = await configOf(guildId);

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

	const after = await configOf(guildId);
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
