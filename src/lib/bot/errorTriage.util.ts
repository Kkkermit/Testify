import { type ActionRowBuilder, ButtonStyle, type MessageActionRowComponentBuilder } from "discord.js";
import { customId } from "@core/button";
import { button, row } from "@lib/discord/components.util";

/** The buttons under an error channel post that mark it pending, solved or unsolved. */

export const ERROR_TRIAGE_ID = "error";

export type TriageState = "pending" | "solved" | "unsolved";

export function isTriageState(value: string): value is TriageState {
	return value === "pending" || value === "solved" || value === "unsolved";
}

/** The current state's button is disabled; a fresh report has none. */
export function triageRow(current: TriageState | null): ActionRowBuilder<MessageActionRowComponentBuilder> {
	return row(
		button({
			id: customId(ERROR_TRIAGE_ID, "pending"),
			label: "Mark as pending",
			style: ButtonStyle.Primary,
			disabled: current === "pending",
		}),
		button({
			id: customId(ERROR_TRIAGE_ID, "solved"),
			label: "Mark as solved",
			style: ButtonStyle.Success,
			disabled: current === "solved",
		}),
		button({
			id: customId(ERROR_TRIAGE_ID, "unsolved"),
			label: "Mark as unsolved",
			style: ButtonStyle.Danger,
			disabled: current === "unsolved",
		}),
	);
}
