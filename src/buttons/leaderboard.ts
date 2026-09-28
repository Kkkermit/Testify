import { defineButton } from "@core/button";
import { boardMessage, LEADERBOARD_ID } from "@lib/economy";
import { BOARD_SCOPES, MONEY_SORTS } from "@testify/shared";

/** The money board's scope and sort buttons, which redraw the board in place for whoever asked for it. */
export default defineButton({
	id: LEADERBOARD_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton() || interaction.guild === null || context.action !== "view") return;

		const [sort, scope] = context.args;
		const known = MONEY_SORTS.find((candidate) => candidate === sort);
		const where = BOARD_SCOPES.find((candidate) => candidate === scope);
		if (known === undefined || where === undefined) return;

		// Drawing the board and fetching avatars outlasts the three seconds Discord gives a button.
		await interaction.deferUpdate();
		const message = await boardMessage(
			interaction.guild,
			{ kind: "economy", sort: known, scope: where },
			interaction.user.id,
			[...context.client.guilds.cache.keys()],
		);

		// Without the empty list the edit keeps the old picture and adds the new one beside it.
		await interaction.editReply({ ...message, attachments: [] });
	},
});
