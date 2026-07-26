import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { debitWallet, requireAccount } from "../../../database/repositories/economyRepository";
import { button, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { blackjackGames, draw, gameKey, handValue, renderHand, shuffledDeck } from "../services/blackjack";
import { resolveAmount } from "../../economy/services/amount";

export default defineCommand({
	name: "blackjack",
	description: "Plays a hand of blackjack against the dealer.",
	category: Category.MiniGames,
	surfaces: ["slash", "prefix"],
	aliases: ["bj"],
	guildOnly: true,
	options: [{ name: "bet", description: "How much to bet, or `all`.", type: "string", required: true }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const games = blackjackGames(ctx.client);
		const key = gameKey(guild.id, ctx.user.id);

		if (games.has(key)) throw new UserFacingError("You already have a hand in progress in this server.");

		const account = await requireAccount(guild.id, ctx.user.id);
		const bet = resolveAmount(ctx.options.getString("bet", true), account.wallet);

		const paid = await debitWallet(guild.id, ctx.user.id, bet);
		if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(bet - account.wallet));

		const deck = shuffledDeck();
		const player = [draw(deck), draw(deck)];
		const dealer = [draw(deck), draw(deck)];

		games.set(key, {
			guildId: guild.id,
			userId: ctx.user.id,
			bet,
			deck,
			player,
			dealer,
			finished: false,
			startedAt: Date.now(),
		});

		// Abandoned hands are cleaned up rather than leaking, and the timer is
		// registered so shutdown can clear it.
		ctx.client.timers.timeout(`blackjack:${key}`, 300_000, () => {
			games.delete(key);
		});

		await ctx.reply({
			embeds: [
				embed({
					category: Category.MiniGames,
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
					button({ id: encodeId(Namespace.Blackjack, "hit", ctx.user.id), label: "Hit", style: ButtonStyle.Primary }),
					button({
						id: encodeId(Namespace.Blackjack, "stand", ctx.user.id),
						label: "Stand",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		});
	},
});
