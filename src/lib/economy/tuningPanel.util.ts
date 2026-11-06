import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { option, row, select } from "@lib/discord/components.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { TUNING_PANEL_ID } from "@lib/economy/economy.constants";
import { formatDurationLong, formatNumber } from "@lib/format/format.util";
import { settingsScreen } from "@lib/settings/settingsScreen.util";
import { type ServerTuning, TUNING_RATES, XP_COOLDOWN_SECONDS } from "@testify/shared";

function rateSelect(action: string, current: number, ownerId: string, describe: (rate: number) => string) {
	return row(
		select({
			id: customId(TUNING_PANEL_ID, action, ownerId),
			options: TUNING_RATES.map((rate) =>
				option({ label: describe(rate), value: String(rate), selected: rate === current }),
			),
		}),
	);
}

/** `/economy settings`: pay, starting money, robbing and the XP rate, each applied on the press. */
export function tuningPanel(tuning: ServerTuning, ownerId: string, note?: string): ContainerMessage {
	return settingsScreen({
		id: TUNING_PANEL_ID,
		ownerId,
		category: "economy",
		title: "⚙️ Economy and XP rates",
		status: "How this server's money and XP differ from the bot's own numbers.",
		...(note !== undefined ? { note } : {}),
		rows: [
			{
				label: "New accounts start with",
				value: formatNumber(tuning.startingWallet),
				action: { action: "wallet", label: "Change", style: ButtonStyle.Secondary },
			},
			{
				label: "Robbing",
				value: tuning.robbing ? "On — members can `/rob` each other" : "Off",
				action: {
					action: "robbing",
					label: tuning.robbing ? "Turn off" : "Turn on",
					style: tuning.robbing ? ButtonStyle.Danger : ButtonStyle.Success,
				},
			},
		],
		pickers: [
			{
				label: "Pay",
				hint: "Scales /daily, /work and /beg.",
				control: rateSelect("pay", tuning.payRate, ownerId, (rate) => `${String(rate)}% of the usual pay`),
			},
			{
				label: "XP",
				hint: "Scales the XP each message earns, before any boost role.",
				control: rateSelect("xp", tuning.xpRate, ownerId, (rate) => `${String(rate)}% of the usual XP`),
			},
			{
				label: "XP cooldown",
				hint: "How long after one message the next can earn XP.",
				control: row(
					select({
						id: customId(TUNING_PANEL_ID, "cooldown", ownerId),
						options: XP_COOLDOWN_SECONDS.map((seconds) =>
							option({
								label: formatDurationLong(seconds * 1_000),
								value: String(seconds),
								selected: seconds === tuning.xpCooldownSeconds,
							}),
						),
					}),
				),
			},
		],
		footer: "A new starting amount applies to accounts opened from now on.",
	});
}
