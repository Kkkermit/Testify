import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { disableWelcome, getWelcome, saveWelcome } from "@database/repositories/settingsRepository";
import { normaliseWelcome } from "@lib/welcome.util";
import {
	DEFAULT_WELCOME_MESSAGE,
	type WelcomeConfigResponse,
	type WelcomePatch,
	welcomePatchSchema,
} from "@testify/shared";

type ApiContext = Context<ApiBindings>;

export const welcome = new Hono<ApiBindings>();

welcome.use("*", requireGuild);

function guildIdOf(context: ApiContext): string {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

/**
 * The bot stores "off" as no record at all, so an absent one becomes a disabled config carrying the defaults a
 * form needs to render. `normaliseWelcome` supplies the migration off the old `isEmbed` flag, so the web
 * inherits it rather than reimplementing it.
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

		// The greeting has nowhere to go without one, and the stored record requires it.
		if (channelId === null) throw badRequest("Choose a channel for the greeting before turning it on.");

		await saveWelcome(guildId, {
			channelId,
			message: patch.message ?? before.message,
			style: patch.style ?? before.style,
		});
	}

	const after = await configOf(guildId);
	await auditChange(context, {
		action: "welcome.update",
		summary: summarisePatch(patch),
		before: pick(before, patch),
		after: pick(after, patch),
	});

	return context.json(after);
});

function pick(config: WelcomeConfigResponse, patch: WelcomePatch): Record<string, unknown> {
	return Object.fromEntries(Object.keys(patch).map((key) => [key, config[key as keyof WelcomeConfigResponse]]));
}

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
function summarisePatch(patch: WelcomePatch): string {
	const parts: string[] = [];

	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned welcomes on" : "Turned welcomes off");
	if (patch.channelId !== undefined) parts.push("Changed the welcome channel");
	if (patch.message !== undefined) parts.push("Edited the greeting");
	if (patch.style !== undefined) parts.push(`Greeting sent as a ${patch.style}`);

	return parts.length === 0 ? "Changed the welcome settings" : parts.join(", ");
}
