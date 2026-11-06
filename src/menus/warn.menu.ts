import { defineContextMenu } from "@core/contextMenu";
import { assertMenuTarget, WARN_MENU, warnForm } from "@lib/moderation";

export default defineContextMenu({
	name: "Warn",
	description: "Warns a member, with the reason typed in a form, exactly as `/warn create` does.",
	type: "user",
	...WARN_MENU,

	async run(interaction) {
		const target = interaction.targetUser;
		assertMenuTarget(interaction.member, target, interaction.targetMember, interaction.client.user.id, false);
		await interaction.showModal(warnForm(target, interaction.user.id));
	},
});
