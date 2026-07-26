import { type ButtonInteraction } from "discord.js";
import { Category } from "../../../config/categories";
import { type TestifyClient } from "../../../core/client";
import { defineComponent } from "../../../core/component";
import { Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { adjustWallet } from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import {
	type BlackjackGame,
	blackjackGames,
	draw,
	gameKey,
	handValue,
	playDealer,
	renderHand,
	settle,
} from "../services/blackjack";

export default defineComponent({
	namespace: Namespace.Blackjack,
	ownerOnly: true,

	async handle(ctx) {
		if (!ctx.interaction.isButton()) return;

		const guildId = ctx.interaction.guildId;
		if (guildId === null) throw new UserFacingError("This only works inside a server.");

		const games = blackjackGames(ctx.client);
		const key = gameKey(guildId, ctx.interaction.user.id);
		const game = games.get(key);

		if (!game || game.finished) throw new UserFacingError("That hand has already finished.");

		if (ctx.action === "hit") {
			game.player.push(draw(game.deck));

			if (handValue(game.player) < 21) {
				await ctx.interaction.update({
					embeds: [
						embed({
							category: Category.MiniGames,
							title: "Blackjack",
							description: `Bet: **${formatNumber(game.bet)}**`,
							fields: [
								{ name: `Your hand (${handValue(game.player)})`, value: renderHand(game.player), inline: true },
								{ name: "Dealer", value: renderHand(game.dealer, true), inline: true },
							],
						}),
					],
				});
				return;
			}
		}

		await finish(ctx.client, ctx.interaction, game, key);
	},
});

async function finish(
	client: TestifyClient,
	interaction: ButtonInteraction,
	game: BlackjackGame,
	key: string,
): Promise<void> {
	game.finished = true;
	playDealer(game.deck, game.dealer);

	const verdict = settle(game.player, game.dealer);
	const payout = verdict === "player" ? game.bet * 2 : verdict === "push" ? game.bet : 0;
	if (payout > 0) await adjustWallet(game.guildId, game.userId, payout);

	blackjackGames(client).delete(key);
	client.timers.clear(`blackjack:${key}`);

	const outcome =
		verdict === "player"
			? `You win **${formatNumber(game.bet)}**.`
			: verdict === "push"
				? "It is a push. Your bet has been returned."
				: `You lost **${formatNumber(game.bet)}**.`;

	await interaction.update({
		embeds: [
			embed({
				category: Category.MiniGames,
				title:
					verdict === "player"
						? "Blackjack \u2014 you win"
						: verdict === "push"
							? "Blackjack \u2014 push"
							: "Blackjack \u2014 dealer wins",
				description: outcome,
				fields: [
					{ name: `Your hand (${handValue(game.player)})`, value: renderHand(game.player), inline: true },
					{ name: `Dealer (${handValue(game.dealer)})`, value: renderHand(game.dealer), inline: true },
				],
			}),
		],
		components: [],
	});
}
