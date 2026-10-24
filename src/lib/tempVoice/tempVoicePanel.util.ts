import { ButtonStyle, ChannelType } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, row } from "@lib/discord/components.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { channelValue, settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { TEMP_VOICE_SETTINGS_ID } from "@lib/tempVoice/tempVoice.constants";
import { TEMP_VOICE_LOBBY_NAME, type TempVoiceSettings } from "@testify/shared";

export function tempVoiceSettingsPanel(settings: TempVoiceSettings, ownerId: string, note?: string): ContainerMessage {
	const status = settings.enabled
		? `${statusDot(true)} — joining <#${settings.lobbyChannelId ?? ""}> makes a channel of your own.`
		: settings.lobbyChannelId === null
			? `${statusDot(false)} — pick a lobby below, or make one, then turn it on.`
			: `${statusDot(false)} — joining the lobby does nothing yet.`;

	return settingsScreen({
		id: TEMP_VOICE_SETTINGS_ID,
		ownerId,
		category: "community",
		title: "🔊 Join to create",
		status,
		...(note !== undefined ? { note } : {}),
		rows: [
			{ label: "Lobby", value: channelValue(settings.lobbyChannelId) },
			{
				label: "New channels go in",
				value: settings.categoryId === null ? "The lobby's own category" : channelValue(settings.categoryId),
			},
			{
				label: "Named",
				value: `\`${settings.nameTemplate}\` — \`{user}\` becomes their name`,
				action: { action: "name", label: "Change" },
			},
			{
				label: "People per channel",
				value: settings.userLimit === 0 ? "No limit" : String(settings.userLimit),
				action: { action: "limit", label: "Change" },
			},
			{ label: "Open right now", value: String(settings.active) },
			...(settings.canManage
				? []
				: [
						{
							label: "⚠️ I cannot make channels",
							value: "Give me Manage Channels and Move Members, or nothing will happen in the lobby.",
						},
					]),
		],
		pickers: [
			{
				label: "Lobby",
				hint: "The voice channel people join to get a channel of their own.",
				control: row(
					channelSelect({
						id: customId(TEMP_VOICE_SETTINGS_ID, "lobby", ownerId),
						placeholder: "Lobby voice channel…",
						channelTypes: [ChannelType.GuildVoice],
						...(settings.lobbyChannelId === null ? {} : { defaultChannelIds: [settings.lobbyChannelId] }),
					}),
				),
			},
			{
				label: "Category for new channels",
				hint: "Leave it empty to put them beside the lobby.",
				control: row(
					channelSelect({
						id: customId(TEMP_VOICE_SETTINGS_ID, "category", ownerId),
						placeholder: "Same category as the lobby",
						channelTypes: [ChannelType.GuildCategory],
						minValues: 0,
						...(settings.categoryId === null ? {} : { defaultChannelIds: [settings.categoryId] }),
					}),
				),
			},
		],
		actions: [
			{
				action: "toggle",
				label: settings.enabled ? "Turn off" : "Turn on",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
				disabled: !settings.enabled && settings.lobbyChannelId === null,
			},
			{
				action: "make-lobby",
				label: `Make a "${TEMP_VOICE_LOBBY_NAME}" lobby`,
				style: ButtonStyle.Secondary,
				disabled: settings.lobbyChannelId !== null || !settings.canManage,
			},
		],
		footer:
			"Each channel is deleted once its last member leaves. When I have Manage Roles, its owner may rename it or set its limit.",
	});
}
