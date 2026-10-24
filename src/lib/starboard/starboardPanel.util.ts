import { ButtonStyle, type MessageCreateOptions } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, linkButton, row } from "@lib/discord/components.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { embed } from "@lib/discord/embeds.util";
import { settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { STARBOARD_SETTINGS_ID } from "@lib/starboard/starboard.constants";
import { STARBOARD_EMOJI, type StarboardSettings } from "@testify/shared";

/** What the repost needs from the starred message, read off it before anything is sent. */
export interface StarredMessage {
	guildId: string;
	channelId: string;
	channelName: string;
	messageId: string;
	authorName: string;
	authorAvatar: string | null;
	content: string;
	imageUrl: string | null;
}

/** Voters who count: never a bot, and never the author unless the server allows it. */
export function starsFrom(
	voters: readonly { id: string; bot: boolean }[],
	authorId: string,
	selfStar: boolean,
): number {
	return voters.filter((voter) => !voter.bot && (selfStar || voter.id !== authorId)).length;
}

export function starLine(stars: number, channelId: string): string {
	return `${STARBOARD_EMOJI} **${String(stars)}** · <#${channelId}>`;
}

export function messageLink(message: Pick<StarredMessage, "guildId" | "channelId" | "messageId">): string {
	return `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.messageId}`;
}

/** Reposted text can mention anybody, so nothing the board sends may ping. */
export function starboardPost(message: StarredMessage, stars: number): MessageCreateOptions {
	return {
		content: starLine(stars, message.channelId),
		embeds: [
			embed({
				category: "community",
				author: {
					name: message.authorName,
					...(message.authorAvatar === null ? {} : { iconURL: message.authorAvatar }),
				},
				...(message.content === "" ? {} : { description: message.content }),
				...(message.imageUrl === null ? {} : { image: message.imageUrl }),
				footer: `#${message.channelName}`,
			}),
		],
		components: [row(linkButton("Jump to message", messageLink(message)))],
		allowedMentions: { parse: [] },
	};
}

export function starboardSettingsPanel(settings: StarboardSettings, ownerId: string, note?: string): ContainerMessage {
	const status = settings.enabled
		? `${statusDot(true)} — messages with ${String(settings.threshold)} ${STARBOARD_EMOJI} are reposted in <#${settings.channelId ?? ""}>.`
		: settings.channelId === null
			? `${statusDot(false)} — pick a channel below, then turn it on.`
			: `${statusDot(false)} — nothing is reposted yet.`;

	return settingsScreen({
		id: STARBOARD_SETTINGS_ID,
		ownerId,
		category: "community",
		title: `${STARBOARD_EMOJI} Starboard`,
		status,
		...(note !== undefined ? { note } : {}),
		rows: [
			{
				label: "Stars needed",
				value: `${String(settings.threshold)} ${STARBOARD_EMOJI}`,
				action: { action: "threshold", label: "Change" },
			},
			{
				label: "The author's own star",
				value: settings.selfStar ? "Counts" : "Does not count",
				action: { action: "self", label: settings.selfStar ? "Stop counting it" : "Count it" },
			},
			{ label: "Messages on the board", value: String(settings.posts) },
			...(settings.channelId !== null && !settings.canSend
				? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
				: []),
		],
		pickers: [
			{
				label: "Reposted in",
				hint: "A channel for highlights. Stars on the board itself do not count.",
				control: row(
					channelSelect({
						id: customId(STARBOARD_SETTINGS_ID, "channel", ownerId),
						placeholder: "Channel for the starboard…",
						...(settings.channelId === null ? {} : { defaultChannelIds: [settings.channelId] }),
					}),
				),
			},
		],
		actions: [
			{
				action: "toggle",
				label: settings.enabled ? "Turn off" : "Turn on",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
				disabled: !settings.enabled && settings.channelId === null,
			},
		],
		footer: `React with ${STARBOARD_EMOJI} to a message. Deleting the original takes its repost down too, and a repost a moderator deletes stays off the board.`,
	});
}
