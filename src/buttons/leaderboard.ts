import { defineButton } from "@core/button";
import { boardMessage, isBoardKind, LEADERBOARD_ID } from "@lib/leaderboardActions.util";

/**
 * Paging the leaderboard, and swapping between the economy and levelling boards —
 * which is the same thing as jumping to the other board's first page, so there is
 * only one action to handle.
 *
 * The page and the board both live in the custom ID. Nothing is held in memory, so
 * two people paging the same board at once cannot disturb each other.
 */
export default defineButton({
	id: LEADERBOARD_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isButton()) return;
		if (context.action !== "goto") return;

		const [kind, page] = context.args;
		if (kind === undefined || !isBoardKind(kind)) return;

		const requested = Number.parseInt(page ?? "0", 10);
		await interaction.deferUpdate();

		const rendered = await boardMessage(
			interaction.guild,
			kind,
			Number.isNaN(requested) ? 0 : Math.max(0, requested),
			interaction.user.id,
		);

		// The old image has to go explicitly: an edit that adds a file keeps the
		// previous attachment otherwise, and the message ends up with both.
		await interaction.editReply({ ...rendered, attachments: [] });
	},
});
