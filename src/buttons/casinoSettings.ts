import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	applyCasinoSettings,
	CASINO_GAME_LABELS,
	CASINO_SETTINGS_ID,
	casinoSettingsPanel,
	parseLimits,
	readCasinoSettings,
} from "@lib/casino";
import { errorEmbed, modalForm } from "@lib/discord";
import { type CasinoPatch, isCasinoGame } from "@testify/shared";

export default defineButton({
	id: CASINO_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guildId = interaction.guildId;
		if (guildId === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the casino.");
		}

		const current = await readCasinoSettings(guildId);
		let patch: CasinoPatch;
		let note: string;

		if (interaction.isButton()) {
			switch (context.action) {
				case "open":
				case "close":
					patch = { enabled: context.action === "open" };
					note = context.action === "open" ? "The casino is open." : "The casino is closed.";
					break;
				case "game": {
					const game = context.args[0];
					if (game === undefined || !isCasinoGame(game)) return;
					patch = { games: { [game]: !current.games[game] } };
					note = `${CASINO_GAME_LABELS[game]} is ${current.games[game] ? "off" : "on"}.`;
					break;
				}
				case "limits":
					await interaction.showModal(
						modalForm({
							id: CASINO_SETTINGS_ID,
							action: "save-limits",
							args: [interaction.user.id],
							title: "Bet limits",
							fields: [
								{ id: "min", label: "Smallest bet", value: String(current.minBet) },
								{
									id: "max",
									label: "Largest bet",
									value: current.maxBet === null ? "" : String(current.maxBet),
									placeholder: "Leave blank for no limit",
									required: false,
								},
							],
						}),
					);
					return;
				default:
					return;
			}
		} else if (interaction.isModalSubmit() && context.action === "save-limits") {
			const limits = parseLimits(
				interaction.fields.getTextInputValue("min"),
				interaction.fields.getTextInputValue("max"),
			);
			if (!limits.ok) {
				await interaction.reply({ embeds: [errorEmbed(limits.reason)], flags: MessageFlags.Ephemeral });
				return;
			}
			patch = { minBet: limits.minBet, maxBet: limits.maxBet };
			note = "The bet limits are saved.";
		} else {
			return;
		}

		const result = await applyCasinoSettings(guildId, patch, interaction.user.id);
		if ("problem" in result) {
			await interaction.reply({ embeds: [errorEmbed(result.problem)], flags: MessageFlags.Ephemeral });
			return;
		}

		const panel = casinoSettingsPanel(result.settings, interaction.user.id, note);
		// A modal opened elsewhere cannot edit this message, so it answers privately instead.
		if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
			await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		} else if (interaction.isButton() || interaction.isModalSubmit()) {
			await interaction.update(panel);
		}
	},
});
