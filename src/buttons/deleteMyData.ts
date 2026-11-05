import { MessageFlags } from "discord.js";
import { defineButton } from "@core/button";
import {
	ERASE_CONFIRM_FIELD,
	ERASE_PANEL_ID,
	eraseAccount,
	eraseCancelled,
	eraseConfirmForm,
	eraseDone,
	erasePanel,
} from "@lib/account";
import { confirmsName } from "@testify/shared";

export default defineButton({
	id: ERASE_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const userId = context.args.at(-1);
		if (userId !== interaction.user.id) return;

		switch (context.action) {
			case "cancel":
				if (!interaction.isButton()) return;
				await interaction.update(eraseCancelled());
				return;

			case "confirm":
				if (!interaction.isButton()) return;
				await interaction.showModal(eraseConfirmForm(userId, interaction.user.username));
				return;

			case "erase": {
				if (!interaction.isModalSubmit() || !interaction.isFromMessage()) return;

				const typed = interaction.fields.getTextInputValue(ERASE_CONFIRM_FIELD);
				if (!confirmsName(typed, interaction.user.username, userId)) {
					await interaction.update(erasePanel(userId, "That was not your username, so nothing was deleted."));
					return;
				}

				await interaction.deferUpdate();
				await eraseAccount(context.client, userId);
				await interaction
					.editReply(eraseDone())
					.catch(() =>
						interaction.followUp({ ...eraseDone(), flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 }),
					);
				return;
			}

			default:
				return;
		}
	},
});
