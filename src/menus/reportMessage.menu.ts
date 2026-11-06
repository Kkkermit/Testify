import { defineContextMenu } from "@core/contextMenu";
import { REPORT_MENU, reportDestination, reportForm } from "@lib/modmail";

export default defineContextMenu({
	name: "Report message",
	description: "Sends a message, and what is wrong with it, to the server's mod mail channel.",
	type: "message",
	...REPORT_MENU,

	async run(interaction) {
		await reportDestination(interaction.guild, interaction.user.id, interaction.targetMessage);
		await interaction.showModal(reportForm(interaction.targetMessage, interaction.user.id));
	},
});
