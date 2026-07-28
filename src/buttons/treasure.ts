import { ButtonStyle, PermissionFlagsBits } from "discord.js";
import { TREASURE_DEFAULTS } from "@config/constants";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type TreasureConfigSettings } from "@database/models/guildSettings.schema";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { confirmRow, modalForm, type RenderedScreen } from "@lib/components.util";
import { errorEmbed } from "@lib/embeds.util";
import { formatDuration, formatNumber } from "@lib/format.util";
import { parseWholeNumber, settingsPanel, statusValue } from "@lib/settingsPanel.util";

export const TREASURE_PANEL_ID = "treasure";

type Settings = Pick<
	TreasureConfigSettings,
	"isEnabled" | "minMessages" | "maxMessages" | "minAmount" | "maxAmount" | "cooldownMs"
>;

/** Falls back to the defaults so an unconfigured guild still renders a full panel. */
export function settingsOf(config: TreasureConfigSettings | null): Settings {
	return {
		isEnabled: config?.isEnabled ?? false,
		minMessages: config?.minMessages ?? TREASURE_DEFAULTS.minMessages,
		maxMessages: config?.maxMessages ?? TREASURE_DEFAULTS.maxMessages,
		minAmount: config?.minAmount ?? TREASURE_DEFAULTS.minAmount,
		maxAmount: config?.maxAmount ?? TREASURE_DEFAULTS.maxAmount,
		cooldownMs: config?.cooldownMs ?? TREASURE_DEFAULTS.cooldownMs,
	};
}

export function treasurePanel(settings: Settings, configured: boolean): RenderedScreen {
	return settingsPanel({
		id: TREASURE_PANEL_ID,
		category: "economy",
		title: "⚙️ Treasure drops — settings",
		description: configured
			? "Random money drops in chat. Press a setting to change it."
			: "Not set up yet. These are the defaults — press **Toggle** to switch drops on.",
		fields: [
			{ name: "Status", value: statusValue(settings.isEnabled) },
			{ name: "Messages between drops", value: `${settings.minMessages}–${settings.maxMessages}` },
			{ name: "Drop size", value: `${formatNumber(settings.minAmount)}–${formatNumber(settings.maxAmount)}` },
			{ name: "Cooldown", value: formatDuration(settings.cooldownMs) },
		].map((field) => ({ label: field.name, value: field.value })),
		actions: [
			{
				action: "toggle",
				label: settings.isEnabled ? "Turn off" : "Turn on",
				style: settings.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
			},
			{ action: "edit-messages", label: "Message range" },
			{ action: "edit-amount", label: "Drop size" },
			{ action: "edit-cooldown", label: "Cooldown" },
			{ action: "reset", label: "Reset to defaults" },
		],
	});
}

async function render(guildId: string): Promise<RenderedScreen> {
	const config = await getTreasureConfig(guildId);
	return treasurePanel(settingsOf(config), config !== null);
}

const MINUTE = 60_000;

export default defineButton({
	id: TREASURE_PANEL_ID,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		const guildId = interaction.guild.id;

		// The panel is public, so anyone could press it — the permission is the gate.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change these settings.");
		}

		const current = settingsOf(await getTreasureConfig(guildId));

		if (interaction.isButton()) {
			switch (context.action) {
				case "toggle":
					await saveTreasureConfig(guildId, {
						...current,
						isEnabled: !current.isEnabled,
						lastModifiedBy: interaction.user.id,
					});
					await interaction.update(await render(guildId));
					return;

				case "edit-messages":
					await interaction.showModal(
						modalForm({
							id: TREASURE_PANEL_ID,
							action: "save-messages",
							title: "Messages between drops",
							fields: [
								{ id: "min", label: "Fewest messages", value: String(current.minMessages) },
								{ id: "max", label: "Most messages", value: String(current.maxMessages) },
							],
						}),
					);
					return;

				case "edit-amount":
					await interaction.showModal(
						modalForm({
							id: TREASURE_PANEL_ID,
							action: "save-amount",
							title: "Drop size",
							fields: [
								{ id: "min", label: "Smallest drop", value: String(current.minAmount) },
								{ id: "max", label: "Largest drop", value: String(current.maxAmount) },
							],
						}),
					);
					return;

				case "edit-cooldown":
					await interaction.showModal(
						modalForm({
							id: TREASURE_PANEL_ID,
							action: "save-cooldown",
							title: "Cooldown",
							fields: [
								{
									id: "minutes",
									label: "Minutes between drops",
									value: String(Math.round(current.cooldownMs / MINUTE)),
								},
							],
						}),
					);
					return;

				// Destructive, so it asks first.
				case "reset":
					await interaction.update({
						embeds: [errorEmbed("Reset every treasure setting back to its default?")],
						components: [confirmRow(TREASURE_PANEL_ID, "reset", interaction.user.id)],
					});
					return;

				case "reset-yes":
					await saveTreasureConfig(guildId, {
						...TREASURE_DEFAULTS,
						isEnabled: current.isEnabled,
						lastModifiedBy: interaction.user.id,
					});
					await interaction.update(await render(guildId));
					return;

				case "reset-no":
					await interaction.update(await render(guildId));
					return;

				default:
					return;
			}
		}

		if (!interaction.isModalSubmit()) return;

		const fields = interaction.fields;
		const problems: string[] = [];
		const next: Settings = { ...current };

		if (context.action === "save-messages") {
			const min = parseWholeNumber(fields.getTextInputValue("min"), "Fewest messages", { min: 5, max: 500 });
			const max = parseWholeNumber(fields.getTextInputValue("max"), "Most messages", { min: 5, max: 1_000 });

			if (!min.ok) problems.push(min.reason);
			if (!max.ok) problems.push(max.reason);
			if (min.ok && max.ok && min.value > max.value) problems.push("The fewest cannot be more than the most.");
			if (min.ok && max.ok) Object.assign(next, { minMessages: min.value, maxMessages: max.value });
		} else if (context.action === "save-amount") {
			const min = parseWholeNumber(fields.getTextInputValue("min"), "Smallest drop", { min: 1, max: 100_000 });
			const max = parseWholeNumber(fields.getTextInputValue("max"), "Largest drop", { min: 1, max: 100_000 });

			if (!min.ok) problems.push(min.reason);
			if (!max.ok) problems.push(max.reason);
			if (min.ok && max.ok && min.value > max.value) problems.push("The smallest cannot be more than the largest.");
			if (min.ok && max.ok) Object.assign(next, { minAmount: min.value, maxAmount: max.value });
		} else if (context.action === "save-cooldown") {
			const minutes = parseWholeNumber(fields.getTextInputValue("minutes"), "Minutes", { min: 1, max: 1_440 });

			if (!minutes.ok) problems.push(minutes.reason);
			else next.cooldownMs = minutes.value * MINUTE;
		} else {
			return;
		}

		// Reported against the panel rather than as a failed command, so the values
		// the user just typed are still on screen behind the message.
		if (problems.length > 0) {
			await interaction.reply({ embeds: [errorEmbed(problems.join("\n"))], flags: 64 });
			return;
		}

		await saveTreasureConfig(guildId, { ...next, lastModifiedBy: interaction.user.id });

		// A modal can only edit the message it was opened from; if it somehow was not,
		// answering privately still beats leaving the interaction hanging.
		if (interaction.isFromMessage()) await interaction.update(await render(guildId));
		else await interaction.reply({ ...(await render(guildId)), flags: 64 });
	},
});
