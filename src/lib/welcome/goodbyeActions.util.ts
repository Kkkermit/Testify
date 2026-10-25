import { type Guild, type GuildMember, type MessageCreateOptions, type PartialGuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import { getGoodbyeSettings, saveGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { embed } from "@lib/discord/embeds.util";
import { DEFAULT_GOODBYE_MESSAGE, fillTemplate, type GoodbyePatch, type GoodbyeSettings } from "@testify/shared";

/** Saying goodbye when somebody leaves: the settings, and the one message the event, the preview and the dashboard share. */

export async function readGoodbye(guild: Guild): Promise<GoodbyeSettings> {
	const stored = await getGoodbyeSettings(guild.id);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		message: stored?.message ?? DEFAULT_GOODBYE_MESSAGE,
		style: stored?.style ?? "text",
		canSend: channelId !== null && canPostIn(guild, channelId),
	};
}

/** A goodbye cannot be on with nowhere to post, so clearing its channel turns it off; a channel is checked as it is chosen. */
export async function applyGoodbye(
	guild: Guild,
	patch: GoodbyePatch,
	updatedBy: string | null,
): Promise<GoodbyeSettings> {
	const current = await readGoodbye(guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;

	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for the goodbye before turning it on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null && !canPostIn(guild, patch.channelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveGoodbyeSettings(
		guild.id,
		{
			enabled: channelId === null ? false : (patch.enabled ?? current.enabled),
			channelId,
			message: patch.message ?? current.message,
			style: patch.style ?? current.style,
		},
		updatedBy,
	);
	return readGoodbye(guild);
}

/** The member has already gone, so `{user}` names them without a ping, and nothing else in the text pings either. */
export function farewellFor(
	member: Pick<GuildMember | PartialGuildMember, "id" | "user" | "guild">,
	settings: Pick<GoodbyeSettings, "message" | "style">,
): MessageCreateOptions {
	const message = fillTemplate(settings.message, {
		mention: `<@${member.id}>`,
		username: member.user.username,
		serverName: member.guild.name,
		memberCount: member.guild.memberCount,
	});
	const allowedMentions = { parse: [] };

	if (settings.style === "text") return { content: message, allowedMentions };

	return {
		embeds: [
			embed({
				category: "community",
				title: `Goodbye from ${member.guild.name}`,
				description: message,
				thumbnail: member.user.displayAvatarURL({ size: 256 }),
			}),
		],
		allowedMentions,
	};
}

export async function sendGoodbye(client: TestifyClient, member: GuildMember | PartialGuildMember): Promise<void> {
	const settings = await getGoodbyeSettings(member.guild.id);
	if (settings?.enabled !== true || settings.channelId === null) return;

	const channel = await client.channels.fetch(settings.channelId).catch(() => null);
	if (channel?.isTextBased() !== true || !channel.isSendable()) return;

	await channel.send(farewellFor(member, settings)).catch((error: unknown) => {
		client.logger.warn(
			{ err: toError(error), guildId: member.guild.id },
			"[GOODBYE] Could not post the goodbye. Check the bot can still send messages in that channel.",
		);
	});
}
