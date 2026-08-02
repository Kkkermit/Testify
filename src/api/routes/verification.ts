import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteVerifyConfig, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { publishVerifyPanel, roleTooHigh } from "@lib/verifyActions.util";
import { isReady, normaliseVerify, type VerifyConfig } from "@lib/verifyPanel.util";
import { type VerificationConfigResponse, type VerificationPatch, verificationPatchSchema } from "@testify/shared";

export const verification = new Hono<ApiBindings>();

verification.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

function bodyOf(guild: Guild, stored: VerifyConfig, exists: boolean): VerificationConfigResponse {
	return {
		enabled: exists,
		channelId: stored.channelId,
		roleId: stored.roleId,
		message: stored.message,
		posted: stored.messageId !== null,
		verifiedCount: stored.verifiedCount,
		roleTooHigh: roleTooHigh(guild, stored.roleId),
	};
}

async function configOf(guild: Guild): Promise<VerificationConfigResponse> {
	const record = await getVerifyConfig(guild.id);
	return bodyOf(guild, normaliseVerify(record), record !== null);
}

verification.get("/", async (context) => context.json(await configOf(guildOf(context))));

/**
 * The panel is not re-posted by a save. Editing the wording of a panel already in a channel does update it —
 * the message is out there saying the old thing — but a first post is always the explicit `publish` action, so
 * choosing a channel cannot drop a message into it before the wording has been looked at.
 */
verification.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, verificationPatchSchema);
	const before = await configOf(guild);

	if (patch.enabled === false) {
		await deleteVerifyConfig(guild.id);
		return await answer(context, guild, patch, before);
	}

	const stored = normaliseVerify(await getVerifyConfig(guild.id));
	const next: VerifyConfig = {
		...stored,
		channelId: patch.channelId ?? stored.channelId,
		roleId: patch.roleId ?? stored.roleId,
		message: patch.message ?? stored.message,
		// A panel posted in the old channel is not the panel in the new one, so the id cannot carry over.
		messageId: patch.channelId !== undefined && patch.channelId !== stored.channelId ? null : stored.messageId,
	};

	if (next.channelId === null || next.roleId === null) {
		throw badRequest("Choose a channel and a role before turning verification on.");
	}

	if (roleTooHigh(guild, next.roleId)) {
		throw badRequest("That role sits at or above Testify's own, so Testify cannot give it to anybody.");
	}

	const shouldPublish = patch.publish === true || (next.messageId !== null && patch.message !== undefined);
	if (shouldPublish && isReady(next)) next.messageId = await publishVerifyPanel(guild, next);

	await saveVerifyConfig(guild.id, {
		channelId: next.channelId,
		roleId: next.roleId,
		message: next.message,
		messageId: next.messageId,
	});

	return await answer(context, guild, patch, before);
});

async function answer(
	context: Context<ApiBindings>,
	guild: Guild,
	patch: VerificationPatch,
	before: VerificationConfigResponse,
): Promise<Response> {
	const after = await configOf(guild);

	await auditChange(context, {
		action: "verification.update",
		summary: summarise(patch),
		before: pick(before, patch),
		after: pick(after, patch),
	});

	return context.json(after);
}

function pick(config: VerificationConfigResponse, patch: VerificationPatch): Record<string, unknown> {
	return Object.fromEntries(
		Object.keys(patch)
			.filter((key) => key in config)
			.map((key) => [key, config[key as keyof VerificationConfigResponse]]),
	);
}

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
function summarise(patch: VerificationPatch): string {
	const parts: string[] = [];

	if (patch.enabled === false) parts.push("Turned verification off");
	if (patch.channelId !== undefined) parts.push("Changed the verification channel");
	if (patch.roleId !== undefined) parts.push("Changed the verified role");
	if (patch.message !== undefined) parts.push("Edited what the panel says");
	if (patch.publish === true) parts.push("Posted the verification panel");

	return parts.length === 0 ? "Changed the verification settings" : parts.join(", ");
}
