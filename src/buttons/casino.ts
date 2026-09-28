import { type ButtonInteraction } from "discord.js";
import { defineButton } from "@core/button";
import { checkCasinoPlay, refusalText } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { attachHandMessage, type HandRecord } from "@database/repositories/casinoRepository";
import {
	blackjackMessage,
	callHiLo,
	CASINO_ID,
	cashOutHiLo,
	hiloMessage,
	isInstantGame,
	outcomeFor,
	playBlackjack,
	playInstant,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino";
import { isCasinoGame } from "@testify/shared";

/** A new table from a Play again button: the same gates the command passes, then a message of its own. */
async function playAgain(
	interaction: ButtonInteraction,
	client: TestifyClient,
	args: readonly string[],
): Promise<void> {
	const [game, call, stake] = args;
	const guildId = interaction.guildId;
	if (guildId === null || game === undefined || call === undefined || stake === undefined || !isCasinoGame(game))
		return;

	const player = { guildId, userId: interaction.user.id };
	const refused = await checkCasinoPlay(client, player, game);
	if (refused !== null) throw new UserFacingError(refusalText(refused));

	if (isInstantGame(game)) {
		await playInstant(interaction, client, player, stake, (bet) => {
			const outcome = outcomeFor(game, call, bet);
			if (outcome === null) throw new UserFacingError("That button no longer knows what it was for. Start a new game.");
			return outcome;
		});
		return;
	}

	let hand: HandRecord | null;
	if (game === "blackjack") {
		const started = await startBlackjack(player, stake);
		hand = started.hand;
		await interaction.reply(blackjackMessage(started.view, player.userId));
	} else {
		const started = await startHiLoHand(player, stake);
		hand = started.hand;
		await interaction.reply(hiloMessage(started.view, player.userId));
	}

	if (hand !== null) {
		const sent = await interaction.fetchReply();
		await attachHandMessage(hand, interaction.channelId, sent.id);
	}
}

export default defineButton({
	id: CASINO_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton() || interaction.guildId === null) return;

		const player = { guildId: interaction.guildId, userId: interaction.user.id };

		switch (context.action) {
			case "again":
				await playAgain(interaction, context.client, context.args);
				return;
			case "bj-hit":
			case "bj-stand":
			case "bj-double": {
				const action = context.action === "bj-hit" ? "hit" : context.action === "bj-stand" ? "stand" : "double";
				await interaction.update(blackjackMessage(await playBlackjack(player, action), player.userId));
				return;
			}
			case "hl-higher":
			case "hl-lower":
				await interaction.update(
					hiloMessage(await callHiLo(player, context.action === "hl-higher" ? "higher" : "lower"), player.userId),
				);
				return;
			case "hl-cash":
				await interaction.update(hiloMessage(await cashOutHiLo(player), player.userId));
				return;
			default:
				return;
		}
	},
});
