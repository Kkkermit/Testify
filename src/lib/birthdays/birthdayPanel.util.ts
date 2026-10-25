import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { BIRTHDAY_PANEL_ID } from "@lib/birthdays/birthdays.constants";
import { channelSelect, row } from "@lib/discord/components.util";
import { withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { type BirthdaySettings } from "@testify/shared";

export function birthdaySettingsPanel(
	settings: BirthdaySettings,
	shared: number,
	ownerId: string,
	note?: string,
): ContainerMessage & { allowedMentions: { parse: [] } } {
	const status = settings.enabled
		? `${statusDot(true)} — birthdays are posted in <#${settings.channelId ?? ""}> on the day.`
		: settings.channelId === null
			? `${statusDot(false)} — pick a channel below, then turn it on.`
			: `${statusDot(false)} — no birthdays are posted yet.`;

	return withoutPings(
		settingsScreen({
			id: BIRTHDAY_PANEL_ID,
			ownerId,
			category: "settings",
			title: "🎂 Birthdays",
			status,
			...(note !== undefined ? { note } : {}),
			rows: [
				{ label: "The message", value: `>>> ${settings.message}`, action: { action: "edit", label: "Edit" } },
				{
					label: "Shared with this server",
					value: `${String(shared)} ${shared === 1 ? "member" : "members"}, each by running \`/birthday set\` here.`,
				},
				...(settings.channelId !== null && !settings.canSend
					? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
					: []),
			],
			pickers: [
				{
					label: "Posted in",
					hint: "Where a birthday is posted, on the day, in UTC.",
					control: row(
						channelSelect({
							id: customId(BIRTHDAY_PANEL_ID, "channel", ownerId),
							placeholder: "Channel for birthdays…",
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
			footer:
				"Placeholders: `{user}` mentions them, `{username}` names them, `{server}` is this server. Only the member is pinged, and never their age, which is not kept.",
		}),
	);
}
