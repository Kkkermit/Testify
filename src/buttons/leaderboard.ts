import { type Message } from "discord.js";
import { defineButton } from "@core/button";
import { boardMessage, isBoardKind, LEADERBOARD_ID } from "@lib/leaderboardActions.util";

/**
 * Belt and braces, because this bug has now survived two fixes that were correct
 * on paper: if the edit still comes back carrying the old boards, throw away
 * everything but the newest attachment.
 *
 * Costs one extra request only when the edit misbehaved, and nothing at all when
 * it did what it was asked.
 */
async function keepOnlyNewestImage(message: Message): Promise<void> {
	if (message.attachments.size <= 1) return;

	const newest = [...message.attachments.values()].at(-1);
	await message.edit({ attachments: newest === undefined ? [] : [newest] });
}

/**
 * Paging the leaderboard, and swapping between the economy and levelling boards —
 * which is the same thing as jumping to the other board's first page, so there is
 * only one action to handle.
 *
 * The page and the board both live in the custom ID. Nothing is held in memory, so
 * two people paging the same board at once cannot disturb each other.
 *
 * **The board is edited onto the message itself, not through the interaction
 * response.** Both `update()` and a deferred `editReply()` left the previous image
 * attached and added the new one beside it, so pressing the swap button three times
 * produced a grid of four boards. `Message#edit` is the plain channel-message edit,
 * where `attachments` genuinely means "the attachments to keep" — an empty list
 * plus one new file leaves exactly one image.
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

		// Acknowledged first so the three-second window is never the constraint, then
		// the message is edited directly.
		await interaction.deferUpdate();

		const requested = Number.parseInt(page ?? "0", 10);
		const rendered = await boardMessage(
			interaction.guild,
			kind,
			Number.isNaN(requested) ? 0 : Math.max(0, requested),
			interaction.user.id,
		);

		const updated = await interaction.message.edit({ ...rendered, attachments: [] });
		await keepOnlyNewestImage(updated);
	},
});
