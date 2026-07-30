import { ButtonStyle } from "discord.js";
import { COUNTING_DEFAULT_MAX } from "@config/constants";
import { customId } from "@core/button";
import { channelSelect, row } from "@lib/components.util";
import { type ContainerMessage } from "@lib/containers.util";
import { formatNumber } from "@lib/format.util";
import { channelValue, settingsScreen } from "@lib/settingsScreen.util";

/** The counting game, configured from one screen rather than four subcommands. */

export const COUNTING_PANEL_ID = "counting";

export const COUNTING_LIMITS = { minGoal: 10, maxGoal: COUNTING_DEFAULT_MAX } as const;

export interface CountingPanelState {
	channelId: string | null;
	count: number;
	goal: number;
	note?: string;
}

export function countingPanel(state: CountingPanelState, ownerId: string): ContainerMessage {
	const off = state.channelId === null;

	return settingsScreen({
		id: COUNTING_PANEL_ID,
		ownerId,
		category: "settings",
		title: "🔢 Counting",
		status: off
			? "Not running yet. Pick a channel and members can start counting from **1**."
			: `Members are counting in ${channelValue(state.channelId)}.`,
		...(state.note !== undefined ? { note: state.note } : {}),
		rows: off
			? []
			: [
					{ label: "Next number", value: formatNumber(state.count + 1), action: { action: "reset", label: "Reset" } },
					{
						label: "Goal",
						value: formatNumber(state.goal),
						action: { action: "goal", label: "Change" },
					},
				],
		pickers: [
			{
				label: "Counting channel",
				hint: "Where members count. Moving it keeps the current number.",
				control: row(
					channelSelect({
						id: customId(COUNTING_PANEL_ID, "channel", ownerId),
						placeholder: off ? "Count in…" : "Move counting somewhere else…",
						...(state.channelId !== null ? { defaultChannelIds: [state.channelId] } : {}),
					}),
				),
			},
		],
		actions: [{ action: "off", label: "Turn off", style: ButtonStyle.Danger, disabled: off }],
		footer: "Nobody may count twice in a row, and a wrong number puts everyone back to 1.",
	});
}
