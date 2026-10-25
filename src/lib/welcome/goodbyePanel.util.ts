import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, row } from "@lib/discord/components.util";
import { withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { GOODBYE_PANEL_ID } from "@lib/welcome/welcome.constants";
import { PLACEHOLDER_HELP } from "@lib/welcome/welcome.util";
import { type GoodbyeSettings, WELCOME_PLACEHOLDERS } from "@testify/shared";

const STYLE_LABELS = { text: "Plain message", embed: "Embed" } as const;

export function goodbyePanel(
	settings: GoodbyeSettings,
	ownerId: string,
	note?: string,
): ContainerMessage & { allowedMentions: { parse: [] } } {
	const status = settings.enabled
		? `${statusDot(true)} — a goodbye is posted in <#${settings.channelId ?? ""}> when somebody leaves.`
		: settings.channelId === null
			? `${statusDot(false)} — pick a channel below, then turn it on.`
			: `${statusDot(false)} — nobody is said goodbye to yet.`;

	const placeholders = WELCOME_PLACEHOLDERS.map(
		(token) => `\`${token}\` ${PLACEHOLDER_HELP[token].toLowerCase()}`,
	).join(" · ");

	return withoutPings(
		settingsScreen({
			id: GOODBYE_PANEL_ID,
			ownerId,
			category: "settings",
			title: "👋 Goodbye messages",
			status,
			...(note !== undefined ? { note } : {}),
			rows: [
				{ label: "The message", value: `>>> ${settings.message}`, action: { action: "edit", label: "Edit" } },
				{
					label: "Sent as",
					value: STYLE_LABELS[settings.style],
					action: {
						action: "style",
						label: settings.style === "text" ? "Use an embed" : "Use a plain message",
						args: [settings.style === "text" ? "embed" : "text"],
					},
				},
				...(settings.channelId !== null && !settings.canSend
					? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
					: []),
			],
			pickers: [
				{
					label: "Posted in",
					hint: "Where the goodbye goes when somebody leaves the server.",
					control: row(
						channelSelect({
							id: customId(GOODBYE_PANEL_ID, "channel", ownerId),
							placeholder: "Channel for goodbyes…",
							...(settings.channelId === null ? {} : { defaultChannelIds: [settings.channelId] }),
						}),
					),
				},
			],
			actions: [
				{ action: "preview", label: "Preview" },
				{
					action: "toggle",
					label: settings.enabled ? "Turn off" : "Turn on",
					style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
					disabled: !settings.enabled && settings.channelId === null,
				},
			],
			footer: `Placeholders: ${placeholders}. Nobody is pinged, because the member has already left.`,
		}),
	);
}
