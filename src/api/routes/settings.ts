import { PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange, auditSettings } from "@api/audit";
import { type ApiBindings, guildIdOf, guildOf } from "@api/context";
import { badRequest, notInGuild } from "@api/errors";
import { requireGrantable, requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { DEFAULT_PREFIX } from "@config/constants";
import { botName } from "@core/brand";
import { disableAntiLink, setAntiLink } from "@database/repositories/antiLinkRepository";
import { setAutoRoles } from "@database/repositories/autoRoleRepository";
import { disableCounting, resetCount, setCounting } from "@database/repositories/countingRepository";
import { setPrefix, setPrefixEnabled } from "@database/repositories/prefixRepository";
import { setVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { readServerSettings } from "@lib/settings";
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
	type PrefixPatch,
	prefixPatch,
	type RestorableAction,
	type ServerSettings,
	voiceStatsPatch,
} from "@testify/shared";

type ApiContext = Context<ApiBindings>;

export const settings = new Hono<ApiBindings>();

settings.use("*", requireGuild);

settings.get("/", async (context) => context.json(await readServerSettings(guildIdOf(context))));

settings.get("/nickname", (context) => {
	const me = guildOf(context).members.me;

	const body: GuildNickname = {
		nickname: me?.nickname ?? null,
		canChange: me?.permissions.has(PermissionFlagsBits.ChangeNickname) ?? false,
	};

	return context.json(body);
});

settings.patch("/nickname", requirePermission(PermissionFlagsBits.ManageNicknames), async (context) => {
	const guild = guildOf(context);
	const { nickname } = await parseBody(context, nicknamePatch);
	const me = guild.members.me;

	if (me === null) throw notInGuild();

	// Surfaced rather than left to fail at Discord, so the message names the permission to grant.
	if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
		throw badRequest(`${botName()} needs the Change Nickname permission in this server.`);
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
	const before = await readServerSettings(guildId);

	if (patch.prefix !== undefined) await setPrefix(guildId, patch.prefix);
	if (patch.enabled !== undefined) await setPrefixEnabled(guildId, patch.enabled);

	return answer(context, guildId, before, "settings.prefix", summarisePrefix(patch));
});

settings.patch("/anti-link", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, antiLinkPatch);
	const before = await readServerSettings(guildId);

	if (patch.enabled === false) {
		await disableAntiLink(guildId);
	} else {
		await setAntiLink(guildId, patch.bypassPermission ?? before.antiLink.bypassPermission);
	}

	return answer(context, guildId, before, "settings.anti-link", summariseAntiLink(patch));
});

settings.put("/auto-roles", requirePermission(PermissionFlagsBits.ManageRoles), async (context) => {
	const guildId = guildIdOf(context);
	const body: AutoRolePut = await parseBody(context, autoRolePut);
	requireGrantable(context, body.roleIds);
	const before = await readServerSettings(guildId);

	await setAutoRoles(guildId, body.roleIds);

	return answer(
		context,
		guildId,
		before,
		"settings.auto-roles",
		`Now giving ${count(body.roleIds.length, "role")} on join`,
	);
});

settings.patch("/counting", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, countingPatch);
	const before = await readServerSettings(guildId);

	if (patch.enabled === false) {
		await disableCounting(guildId);
	} else {
		const channelId = patch.channelId ?? before.counting.channelId;

		// The stored record requires a channel, and counting with nowhere to count is not a configuration.
		if (channelId === null) throw badRequest("Choose a channel for counting before turning it on.");

		await setCounting(guildId, channelId, patch.maxCount ?? before.counting.maxCount);
		if (patch.reset === true) await resetCount(guildId);
	}

	return answer(context, guildId, before, "settings.counting", summariseCounting(patch));
});

settings.patch("/voice-stats", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, voiceStatsPatch);
	const before = await readServerSettings(guildId);

	// An absent key means "leave it", so only the keys that were sent reach `$set`.
	await setVoiceCounter(guildId, {
		...(patch.memberChannelId === undefined ? {} : { memberChannelId: patch.memberChannelId }),
		...(patch.botChannelId === undefined ? {} : { botChannelId: patch.botChannelId }),
	});

	return answer(context, guildId, before, "settings.voice-stats", "Changed the voice stat channels");
});

async function answer(
	context: ApiContext,
	guildId: string,
	before: ServerSettings,
	action: RestorableAction,
	summary: string,
): Promise<Response> {
	const after = await readServerSettings(guildId);
	await auditSettings(context, { action, summary, before, after });

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
