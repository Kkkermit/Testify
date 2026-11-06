import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getTuning, saveTuning } from "@database/repositories/tuningRepository";
import { modalForm } from "@lib/discord";
import { TUNING_PANEL_ID, tuningPanel } from "@lib/economy";
import { formatNumber } from "@lib/format";
import { TUNING_LIMITS, TUNING_RATES, XP_COOLDOWN_SECONDS } from "@testify/shared";

const pick = <T extends number>(list: readonly T[], value: string | undefined): T | undefined =>
	list.find((choice) => String(choice) === value);

export default defineButton({
	id: TUNING_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on the press and again on the form, since a role can change while the form is open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the economy and XP rates.");
		}

		const ownerId = interaction.user.id;
		const update = async (changes: Parameters<typeof saveTuning>[1], note: string): Promise<void> => {
			if (!interaction.isMessageComponent() && !(interaction.isModalSubmit() && interaction.isFromMessage())) return;
			const tuning = await saveTuning(guild.id, changes, ownerId);
			await interaction.update(tuningPanel(tuning, ownerId, note));
		};

		if (interaction.isStringSelectMenu()) {
			const value = interaction.values[0];
			if (context.action === "pay") {
				const payRate = pick(TUNING_RATES, value);
				if (payRate !== undefined) await update({ payRate }, `Pay is now ${String(payRate)}% of the usual.`);
			} else if (context.action === "xp") {
				const xpRate = pick(TUNING_RATES, value);
				if (xpRate !== undefined) await update({ xpRate }, `XP is now ${String(xpRate)}% of the usual.`);
			} else if (context.action === "cooldown") {
				const xpCooldownSeconds = pick(XP_COOLDOWN_SECONDS, value);
				if (xpCooldownSeconds !== undefined) await update({ xpCooldownSeconds }, "The XP cooldown has changed.");
			}
			return;
		}

		if (context.action === "robbing" && interaction.isButton()) {
			const robbing = !(await getTuning(guild.id)).robbing;
			await update({ robbing }, robbing ? "Robbing is on." : "Robbing is off.");
			return;
		}

		if (context.action === "wallet" && interaction.isButton()) {
			const current = await getTuning(guild.id);
			await interaction.showModal(
				modalForm({
					id: TUNING_PANEL_ID,
					action: "wallet-save",
					args: [ownerId],
					title: "Starting wallet",
					fields: [
						{
							id: "amount",
							label: `Between 0 and ${formatNumber(TUNING_LIMITS.maxStartingWallet)}`,
							value: String(current.startingWallet),
							maxLength: 6,
						},
					],
				}),
			);
			return;
		}

		if (context.action === "wallet-save" && interaction.isModalSubmit()) {
			const amount = Number(interaction.fields.getTextInputValue("amount").replace(/[,\s]/g, ""));
			if (!Number.isInteger(amount) || amount < 0 || amount > TUNING_LIMITS.maxStartingWallet) {
				throw new UserFacingError(
					`Give a whole number between 0 and ${formatNumber(TUNING_LIMITS.maxStartingWallet)}.`,
				);
			}
			await update({ startingWallet: amount }, `New accounts start with ${formatNumber(amount)}.`);
		}
	},
});
