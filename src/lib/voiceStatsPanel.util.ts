import { ButtonStyle, ChannelType } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, row } from "@lib/components.util";
import { type ContainerMessage } from "@lib/containers.util";
import { channelValue, settingsScreen } from "@lib/settingsScreen.util";

/** Live member and bot counts in voice channel names, from one screen. */

export const VOICESTATS_PANEL_ID = "voicestats";

export interface VoiceStatsPanelState {
	memberChannelId: string | null;
	botChannelId: string | null;
	note?: string;
}

/** Voice channels only: the count is the channel's name, and text names cannot show it. */
const VOICE_TYPES = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];

export function voiceStatsPanel(state: VoiceStatsPanelState, ownerId: string): ContainerMessage {
	const off = state.memberChannelId === null && state.botChannelId === null;

	return settingsScreen({
		id: VOICESTATS_PANEL_ID,
		ownerId,
		category: "settings",
		title: "📊 Voice counters",
		status: off
			? "No counters yet. Pick a voice channel and I will keep its name up to date."
			: "The channel names below are rewritten whenever the counts change.",
		...(state.note !== undefined ? { note: state.note } : {}),
		rows: off
			? []
			: [
					{ label: "Members", value: channelValue(state.memberChannelId) },
					{ label: "Bots", value: channelValue(state.botChannelId) },
				],
		pickers: [
			row(
				channelSelect({
					id: customId(VOICESTATS_PANEL_ID, "members", ownerId),
					placeholder: "Voice channel for the member count…",
					channelTypes: VOICE_TYPES,
					minValues: 0,
					...(state.memberChannelId !== null ? { defaultChannelIds: [state.memberChannelId] } : {}),
				}),
			),
			row(
				channelSelect({
					id: customId(VOICESTATS_PANEL_ID, "bots", ownerId),
					placeholder: "Voice channel for the bot count…",
					channelTypes: VOICE_TYPES,
					minValues: 0,
					...(state.botChannelId !== null ? { defaultChannelIds: [state.botChannelId] } : {}),
				}),
			),
		],
		actions: [
			{ action: "refresh", label: "Update now", disabled: off },
			{ action: "off", label: "Turn off", style: ButtonStyle.Danger, disabled: off },
		],
		footer: "Discord rate-limits channel renames to twice every ten minutes, so counts lag a little.",
	});
}
