import { MessageFlags } from "discord.js";
import { defineButton } from "@core/button";
import { checkContextMenu } from "@core/checks";
import { refusalEmbed, successEmbed } from "@lib/discord";
import { REPORT_FORM_ID, REPORT_MENU, sendReport } from "@lib/modmail";

export default defineButton({
	id: REPORT_FORM_ID,
	ownerOnly: true,

	async run(interaction, { client, args }) {
		if (!interaction.isModalSubmit() || !interaction.inCachedGuild()) return;
		const [channelId, messageId] = args;
		if (channelId === undefined || messageId === undefined) return;

		const refusal = await checkContextMenu(client, interaction, REPORT_MENU);
		if (refusal !== null) {
			await interaction.reply({ embeds: [refusalEmbed(refusal)], flags: MessageFlags.Ephemeral });
			return;
		}

		await sendReport(interaction.member, channelId, messageId, interaction.fields.getTextInputValue("reason").trim());
		await interaction.reply({
			embeds: [successEmbed("Thank you. The moderators have been sent the message and what you said about it.")],
			flags: MessageFlags.Ephemeral,
		});
	},
});
