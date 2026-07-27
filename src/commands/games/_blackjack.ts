import { ButtonStyle } from "discord.js";
import { strings } from "../../config/strings";
import { customId } from "../../core/button";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { debitWallet, requireAccount } from "../../database/repositories/economyRepository";
import { resolveAmount } from "../../lib/amount";
import { blackjackGames, draw, gameKey, handValue, renderHand, shuffledDeck } from "../../lib/blackjack";
import { button, row } from "../../lib/components";
import { embed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "blackjack",
	description: "Plays a hand of blackjack against the dealer.",
	category: "games",
	guildOnly: true,
	options: [{ name: "bet", description: "How much to bet, or `all`.", type: "string", required: true }],

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const games = blackjackGames();
		const key = gameKey(guild.id, interaction.user.id);

		if (games.has(key)) throw new UserFacingError("You already have a hand in progress in this server.");

		const account = await requireAccount(guild.id, interaction.user.id);
		const bet = resolveAmount(interaction.options.getString("bet", true), account.wallet);

		const paid = await debitWallet(guild.id, interaction.user.id, bet);
		if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(bet - account.wallet));

		const deck = shuffledDeck();
		const player = [draw(deck), draw(deck)];
		const dealer = [draw(deck), draw(deck)];

		games.set(key, {
			guildId: guild.id,
			userId: interaction.user.id,
			bet,
			deck,
			player,
			dealer,
			finished: false,
			startedAt: Date.now(),
		});

		// Abandoned hands are cleaned up rather than leaking, and the timer is
		// registered so shutdown can clear it.
		client.timers.after(`blackjack:${key}`, 300_000, () => {
			games.delete(key);
		});

		await reply(interaction, {
			embeds: [
				embed({
					category: "games",
					title: "Blackjack",
					description: `Bet: **${formatNumber(bet)}**`,
					fields: [
						{ name: `Your hand (${handValue(player)})`, value: renderHand(player), inline: true },
						{ name: "Dealer", value: renderHand(dealer, true), inline: true },
					],
				}),
			],
			components: [
				row(
					button({ id: customId("blackjack", "hit", interaction.user.id), label: "Hit", style: ButtonStyle.Primary }),
					button({
						id: customId("blackjack", "stand", interaction.user.id),
						label: "Stand",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		});
	},
});
