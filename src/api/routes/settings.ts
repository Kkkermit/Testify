import { PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { DEFAULT_PREFIX } from "@config/constants";
import {
	disableAntiLink,
	disableCounting,
	getAntiLink,
	getAutoRoles,
	getCounting,
	getPrefixConfig,
	getVoiceCounter,
	resetCount,
	setAntiLink,
	setAutoRoles,
	setCounting,
	setPrefix,
	setPrefixEnabled,
	setVoiceCounter,
} from "@database/repositories/settingsRepository";
import {
	type AntiLinkPatch,
	antiLinkPatch,
	type AutoRolePut,
	autoRolePut,
	type CountingPatch,
	countingPatch,
	DEFAULT_BYPASS,
	type GuildNickname,
	nicknamePatch,
	isBypassPermission,
	type PrefixPatch,
	prefixPatch,
	type ServerSettings,
	SETTINGS_LIMITS,
	voiceStatsPatch,
} from "@testify/shared";

/**
 * The settings that are only ever configuration. Each section is its own endpoint and writes on change, because
 * each is an independent decision — there is nothing here to batch behind a Save button.
 */

type ApiContext = Context<ApiBindings>;

export const settings = new Hono<ApiBindings>();

settings.use("*", requireGuild);

function guildIdOf(context: ApiContext): string {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

async function settingsOf(guildId: string): Promise<ServerSettings> {
	const [prefix, antiLink, autoRoles, counting, voice] = await Promise.all([
		getPrefixConfig(guildId),
		getAntiLink(guildId),
		getAutoRoles(guildId),
		getCounting(guildId),
		getVoiceCounter(guildId),
	]);

	return {
		prefix: { prefix: prefix.prefix, enabled: prefix.isEnabled },
		antiLink: {
			// No record is how the bot stores "off"; the stored flag name is normalised so an old value cannot
			// reach the browser as an option the form has no button for.
			enabled: antiLink !== null,
			bypassPermission:
				antiLink !== null && isBypassPermission(antiLink.bypassPermission) ? antiLink.bypassPermission : DEFAULT_BYPASS,
		},
		autoRoles: { roleIds: autoRoles?.roleIds ?? [] },
		counting: {
			enabled: counting !== null,
			channelId: counting?.channelId ?? null,
			maxCount: counting?.maxCount ?? SETTINGS_LIMITS.maxCount,
			count: counting?.count ?? 0,
		},
		voiceStats: {
			memberChannelId: voice?.memberChannelId ?? null,
			botChannelId: voice?.botChannelId ?? null,
		},
	};
}

settings.get("/", async (context) => context.json(await settingsOf(guildIdOf(context))));

function guildOf(context: ApiContext) {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

/**
 * The bot's nickname in this server — the only part of its appearance a manager may change, because Discord
 * has no per-guild avatar for bots. The global name and picture belong to the owner console.
 */
settings.get("/nickname", (context) => {
	const me = guildOf(context).members.me;

	const body: GuildNickname = {
		nickname: me?.nickname ?? null,
		canChange: me?.permissions.has(PermissionFlagsBits.ChangeNickname) ?? false,
	};

	return context.json(body);
});

settings.patch("/nickname", async (context) => {
	const guild = guildOf(context);
	const { nickname } = await parseBody(context, nicknamePatch);
	const me = guild.members.me;

	if (me === null) throw notFound("guild_not_found", "Testify is not in that server.");

	// Surfaced rather than left to fail at Discord, so the message names the permission to grant.
	if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
		throw badRequest("Testify needs the Change Nickname permission in this server.");
	}

	try {
		await me.setNickname(nickname === "" ? null : nickname);
	} catch (error) {
		throw badRequest(error instanceof Error ? error.message : "Discord refused that nickname.");
	}

	await auditChange(context, {
		action: "settings.nickname",
		summary: nickname === null || nickname === "" ? "Cleared the bot's nickname" : `Renamed the bot to ${nickname}`,
		after: { nickname },
	});

	const body: GuildNickname = { nickname: me.nickname, canChange: true };
	return context.json(body);
});

settings.patch("/prefix", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, prefixPatch);

	if (patch.prefix !== undefined) await setPrefix(guildId, patch.prefix);
	if (patch.enabled !== undefined) await setPrefixEnabled(guildId, patch.enabled);

	return answer(context, guildId, "settings.prefix", summarisePrefix(patch));
});

settings.patch("/anti-link", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, antiLinkPatch);
	const before = (await settingsOf(guildId)).antiLink;

	if (patch.enabled === false) {
		await disableAntiLink(guildId);
	} else {
		await setAntiLink(guildId, patch.bypassPermission ?? before.bypassPermission);
	}

	return answer(context, guildId, "settings.anti-link", summariseAntiLink(patch));
});

settings.put("/auto-roles", async (context) => {
	const guildId = guildIdOf(context);
	const body: AutoRolePut = await parseBody(context, autoRolePut);

	await setAutoRoles(guildId, body.roleIds);

	return answer(context, guildId, "settings.auto-roles", `Now giving ${count(body.roleIds.length, "role")} on join`);
});

settings.patch("/counting", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, countingPatch);
	const before = (await settingsOf(guildId)).counting;

	if (patch.enabled === false) {
		await disableCounting(guildId);
	} else {
		const channelId = patch.channelId ?? before.channelId;

		// The stored record requires a channel, and counting with nowhere to count is not a configuration.
		if (channelId === null) throw badRequest("Choose a channel for counting before turning it on.");

		await setCounting(guildId, channelId, patch.maxCount ?? before.maxCount);
		if (patch.reset === true) await resetCount(guildId);
	}

	return answer(context, guildId, "settings.counting", summariseCounting(patch));
});

settings.patch("/voice-stats", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, voiceStatsPatch);

	// An absent key means "leave it", so only the keys that were sent reach `$set`.
	await setVoiceCounter(guildId, {
		...(patch.memberChannelId === undefined ? {} : { memberChannelId: patch.memberChannelId }),
		...(patch.botChannelId === undefined ? {} : { botChannelId: patch.botChannelId }),
	});

	return answer(context, guildId, "settings.voice-stats", "Changed the voice stat channels");
});

/**
 * Every write answers with the whole settings document rather than its own section, so one response keeps the
 * screen consistent — a section that refuses cannot leave the rest of the page showing a value it does not have.
 */
async function answer(context: ApiContext, guildId: string, action: string, summary: string): Promise<Response> {
	const after = await settingsOf(guildId);
	await auditChange(context, { action, summary, after });

	return context.json(after);
}

function count(value: number, noun: string): string {
	return `${String(value)} ${noun}${value === 1 ? "" : "s"}`;
}

function summarisePrefix(patch: PrefixPatch): string {
	const parts: string[] = [];

	if (patch.enabled !== undefined)
		parts.push(patch.enabled ? "Turned prefix commands on" : "Turned prefix commands off");
	if (patch.prefix !== undefined) parts.push(`Changed the prefix to ${patch.prefix}`);

	return parts.length === 0 ? `Changed the prefix settings (default is ${DEFAULT_PREFIX})` : parts.join(", ");
}

function summariseAntiLink(patch: AntiLinkPatch): string {
	if (patch.enabled === false) return "Turned link filtering off";
	if (patch.enabled === true) return "Turned link filtering on";

	return `Only ${patch.bypassPermission ?? DEFAULT_BYPASS} may post links`;
}

function summariseCounting(patch: CountingPatch): string {
	const parts: string[] = [];

	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned counting on" : "Turned counting off");
	if (patch.channelId !== undefined) parts.push("Moved the counting channel");
	if (patch.maxCount !== undefined) parts.push(`Counting up to ${String(patch.maxCount)}`);
	if (patch.reset === true) parts.push("Reset the count");

	return parts.length === 0 ? "Changed the counting settings" : parts.join(", ");
}
