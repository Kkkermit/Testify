import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type StoredConversation } from "@database/repositories/modmailRepository";
import { button, channelSelect, option, roleSelect, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { MODMAIL_ID, MODMAIL_SETTINGS_ID } from "@lib/modmail/modmail.constants";
import { settingsScreen, statusDot, switchAction } from "@lib/settings/settingsScreen.util";
import { MODMAIL_NOTE_PREFIX, type ModmailSettings } from "@testify/shared";

const seconds = (date: Date): string => String(Math.floor(date.getTime() / 1_000));

function quoted(value: string): string {
	return value
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

/** The thread's name in the staff channel, inside Discord's 100 characters. */
export function threadName(username: string): string {
	return `📬 ${username}`.slice(0, 100);
}

/** The first post in a conversation's thread, carrying what the member wrote and the Close button. */
export function openingPost(
	conversation: StoredConversation,
	firstMessage: string,
	pingRoleId: string | null,
): ContainerMessage {
	const ping = pingRoleId === null ? "" : `<@&${pingRoleId}> `;
	const parts: ContainerPart[] = [
		text(`## 📬 Mod mail\n${ping}<@${conversation.userId}> (${conversation.username}) · ${conversation.userId}`),
		text(quoted(firstMessage)),
		divider(),
		text(
			`-# Everything you write in this thread is sent to them, except a message starting with \`${MODMAIL_NOTE_PREFIX}\`, which stays here. Opened <t:${seconds(conversation.createdAt)}:R>.`,
		),
		row(button({ id: customId(MODMAIL_ID, "close", conversation.id), label: "Close", style: ButtonStyle.Danger })),
	];

	return containerMessage(container({ category: "moderation", parts }));
}

/** `/modmail open`: the button that opens the form, because a prefix command cannot show one. */
export function writePanel(guildName: string, guildId: string, userId: string): ContainerMessage {
	return containerMessage(
		container({
			category: "moderation",
			parts: [
				text(
					`## 📬 Write to the staff of ${guildName}\nOnly they read it. Their replies come to you in a direct message, and anything you send me there goes back to them until one of you closes it.`,
				),
				row(button({ id: customId(MODMAIL_ID, "write", guildId, userId), label: "Write to the staff", emoji: "✏️" })),
			],
		}),
	);
}

/** Offered in a direct message to somebody with nothing open who shares servers that take mod mail. */
export function offerPanel(servers: readonly { id: string; name: string }[], userId: string): ContainerMessage {
	return containerMessage(
		container({
			category: "moderation",
			parts: [
				text(
					"## 📬 Write to a server's staff?\nPick the server and write your message. Its staff get it in a private thread, and their replies come back here.",
				),
				row(
					select({
						id: customId(MODMAIL_ID, "pick", userId),
						placeholder: "Choose a server…",
						options: servers.map((server) => option({ label: server.name.slice(0, 100), value: server.id })),
					}),
				),
			],
		}),
	);
}

/** Sent to the member once a conversation opens, with their own way to close it. */
export function openedNotice(guildName: string, conversationId: string, userId: string): ContainerMessage {
	return containerMessage(
		container({
			category: "moderation",
			parts: [
				text(
					`## 📬 Sent to the staff of ${guildName}\nEverything you send me here now goes to them, and their replies come back here, until one of you closes it.`,
				),
				row(
					button({
						id: customId(MODMAIL_ID, "close-own", conversationId, userId),
						label: "Close",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		}),
	);
}

/** What the member's own Close leaves; a Components V2 message can only be edited into another. */
export function closedNotice(): ContainerMessage {
	return containerMessage(
		container({
			category: "moderation",
			parts: [text("📬 Closed. Write to me again whenever you want to start a new one.")],
		}),
	);
}

/** How a staff reply is signed in the member's direct messages. */
export function staffSignature(guildName: string, staffName: string, anonymous: boolean): string {
	return anonymous ? `**Staff of ${guildName}**` : `**${staffName}** · staff of ${guildName}`;
}

/** `/modmail settings`: the switch, the channel threads are made in, who is pinged and how replies are signed. */
export function modmailSettingsPanel(settings: ModmailSettings, ownerId: string, note?: string): ContainerMessage {
	const status = settings.enabled
		? `${statusDot(true)} — members can write to staff, in threads in <#${settings.channelId ?? ""}>.`
		: settings.channelId === null
			? `${statusDot(false)} — pick a channel below, then turn it on.`
			: `${statusDot(false)} — members cannot write to staff yet.`;

	return settingsScreen({
		id: MODMAIL_SETTINGS_ID,
		ownerId,
		category: "moderation",
		title: "📬 Mod mail",
		status,
		...(note !== undefined ? { note } : {}),
		rows: [
			{ label: "Open conversations", value: String(settings.open) },
			...(settings.channelId !== null && !settings.canUse
				? [
						{
							label: "⚠️ I cannot work there",
							value: "Let me send messages, create public threads and manage threads in that channel.",
						},
					]
				: []),
		],
		pickers: [
			{
				label: "Threads go in",
				hint: "Each conversation gets a thread here. Keep the channel to staff.",
				control: row(
					channelSelect({
						id: customId(MODMAIL_SETTINGS_ID, "channel", ownerId),
						placeholder: "Channel for mod mail…",
						...(settings.channelId === null ? {} : { defaultChannelIds: [settings.channelId] }),
					}),
				),
			},
			{
				label: "Ping when one opens",
				hint: "Leave it empty to ping nobody.",
				control: row(
					roleSelect({
						id: customId(MODMAIL_SETTINGS_ID, "ping", ownerId),
						placeholder: "Nobody",
						minValues: 0,
						...(settings.pingRoleId === null ? {} : { defaultRoleIds: [settings.pingRoleId] }),
					}),
				),
			},
			{
				label: "Replies are signed",
				control: row(
					select({
						id: customId(MODMAIL_SETTINGS_ID, "signed", ownerId),
						options: [
							option({ label: "With the staff member's name", value: "named", selected: !settings.anonymous }),
							option({ label: "As the server's staff", value: "anonymous", selected: settings.anonymous }),
						],
					}),
				),
			},
		],
		actions: [switchAction(settings.enabled, settings.channelId !== null)],
		footer: `Members start with /modmail open, or by messaging me directly. Staff need Manage Messages to close one.`,
	});
}
