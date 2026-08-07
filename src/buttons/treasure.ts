import { ButtonStyle, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { confirmRow, modalForm, type RenderedScreen } from "@lib/components.util";
import { errorEmbed } from "@lib/embeds.util";
import { formatDuration, formatNumber } from "@lib/format.util";
import { parseWholeNumber, settingsPanel, statusValue } from "@lib/settingsPanel.util";
import { normaliseTreasure } from "@lib/treasureActions.util";
import { TREASURE_DEFAULTS, TREASURE_LIMITS, type TreasureSettings } from "@testify/shared";

export const TREASURE_PANEL_ID = "treasure";

type Settings = TreasureSettings;

export const settingsOf = normaliseTreasure;

/** The panel's shape carries `configured`, which is not a stored column. */
function toStored(settings: Settings): Omit<Settings, "enabled" | "configured"> & { isEnabled: boolean } {
	const { configured: _configured, enabled, ...rest } = settings;

	return { ...rest, isEnabled: enabled };
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
			{ name: "Status", value: statusValue(settings.enabled) },
			{ name: "Messages between drops", value: `${settings.minMessages}–${settings.maxMessages}` },
			{ name: "Drop size", value: `${formatNumber(settings.minAmount)}–${formatNumber(settings.maxAmount)}` },
			{ name: "Cooldown", value: formatDuration(settings.cooldownMs) },
		].map((field) => ({ label: field.name, value: field.value })),
		actions: [
			{
				action: "toggle",
				label: settings.enabled ? "Turn off" : "Turn on",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
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
						...toStored(current),
						isEnabled: !current.enabled,
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
						isEnabled: current.enabled,
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
			const min = parseWholeNumber(fields.getTextInputValue("min"), "Fewest messages", {
				min: TREASURE_LIMITS.minMessages,
				max: TREASURE_LIMITS.maxMessages,
			});
			const max = parseWholeNumber(fields.getTextInputValue("max"), "Most messages", {
				min: TREASURE_LIMITS.minMessages,
				max: TREASURE_LIMITS.maxMessages,
			});

			if (!min.ok) problems.push(min.reason);
			if (!max.ok) problems.push(max.reason);
			if (min.ok && max.ok && min.value > max.value) problems.push("The fewest cannot be more than the most.");
			if (min.ok && max.ok) Object.assign(next, { minMessages: min.value, maxMessages: max.value });
		} else if (context.action === "save-amount") {
			const min = parseWholeNumber(fields.getTextInputValue("min"), "Smallest drop", {
				min: TREASURE_LIMITS.minAmount,
				max: TREASURE_LIMITS.maxAmount,
			});
			const max = parseWholeNumber(fields.getTextInputValue("max"), "Largest drop", {
				min: TREASURE_LIMITS.minAmount,
				max: TREASURE_LIMITS.maxAmount,
			});

			if (!min.ok) problems.push(min.reason);
			if (!max.ok) problems.push(max.reason);
			if (min.ok && max.ok && min.value > max.value) problems.push("The smallest cannot be more than the largest.");
			if (min.ok && max.ok) Object.assign(next, { minAmount: min.value, maxAmount: max.value });
		} else if (context.action === "save-cooldown") {
			const minutes = parseWholeNumber(fields.getTextInputValue("minutes"), "Minutes", {
				min: TREASURE_LIMITS.minCooldownMinutes,
				max: TREASURE_LIMITS.maxCooldownMinutes,
			});

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

		await saveTreasureConfig(guildId, { ...toStored(next), lastModifiedBy: interaction.user.id });

		// A modal can only edit the message it was opened from; if it somehow was not,
		// answering privately still beats leaving the interaction hanging.
		if (interaction.isFromMessage()) await interaction.update(await render(guildId));
		else await interaction.reply({ ...(await render(guildId)), flags: 64 });
	},
});
