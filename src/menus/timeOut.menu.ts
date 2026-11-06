import { defineContextMenu } from "@core/contextMenu";
import { assertMenuTarget, TIMEOUT_MENU, timeoutForm } from "@lib/moderation";

export default defineContextMenu({
	name: "Time out",
	description: "Times a member out for as long as is typed in a form, exactly as `/mute` does.",
	type: "user",
	...TIMEOUT_MENU,

	async run(interaction) {
		const target = interaction.targetUser;
		assertMenuTarget(interaction.member, target, interaction.targetMember, interaction.client.user.id, true);
		await interaction.showModal(timeoutForm(target, interaction.user.id));
	},
});
