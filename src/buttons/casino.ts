import { type MessageComponentInteraction } from "discord.js";
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
	openRound,
	outcomeFor,
	playBlackjack,
	playInstant,
	type Player,
	roundBettingMessage,
	roundView,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino";
import { type CasinoGame, isCasinoGame } from "@testify/shared";

const stale = (): UserFacingError =>
	new UserFacingError("That button no longer knows what it was for. Start a new game.");

/** Every new game passes the gates the command does, not only the ones the old message was sent through. */
async function admit(client: TestifyClient, player: Player, game: CasinoGame): Promise<void> {
	const refused = await checkCasinoPlay(client, player, game);
	if (refused !== null) throw new UserFacingError(refusalText(refused));
}

/** Play again on the same message: roulette opens a fresh round there, the rest deal again. */
async function playAgain(
	interaction: MessageComponentInteraction,
	client: TestifyClient,
	player: Player,
	args: readonly string[],
): Promise<void> {
	const [game, call, stake] = args;
	if (game === undefined || call === undefined || stake === undefined || !isCasinoGame(game)) return;

	await admit(client, player, game);

	if (game === "roulette") {
		const chip = Number(stake);
		if (!Number.isSafeInteger(chip) || chip <= 0) throw stale();
		const round = await openRound(
			{ guildId: player.guildId, channelId: interaction.channelId, messageId: interaction.message.id },
			player.userId,
			chip,
		);
		if (round === null) throw new UserFacingError("A new round is already starting here.");
		await interaction.update(roundBettingMessage(roundView(round)));
		return;
	}

	if (isInstantGame(game)) {
		await interaction.deferUpdate();
		await playInstant(interaction, client, player, stake, (bet) => {
			const outcome = outcomeFor(game, call, bet);
			if (outcome === null) throw stale();
			return outcome;
		});
		return;
	}

	let hand: HandRecord | null;
	if (game === "blackjack") {
		const started = await startBlackjack(player, stake);
		hand = started.hand;
		await interaction.update(blackjackMessage(started.view, player.userId));
	} else {
		const started = await startHiLoHand(player, stake);
		hand = started.hand;
		await interaction.update(hiloMessage(started.view, player.userId));
	}

	if (hand !== null) await attachHandMessage(hand, interaction.channelId, interaction.message.id);
}

export default defineButton({
	id: CASINO_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guildId === null) return;

		const player = { guildId: interaction.guildId, userId: interaction.user.id };

		if (!interaction.isButton()) return;

		switch (context.action) {
			case "again":
				await playAgain(interaction, context.client, player, context.args);
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
