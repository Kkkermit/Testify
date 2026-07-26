import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	adjustWallet,
	debitWallet,
	incrementCounters,
	requireAccount,
} from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { resolveAmount } from "../services/amount";

type GameKind = "coinflip" | "dice" | "slots";

const SLOT_SYMBOLS = ["\u{1f352}", "\u{1f34b}", "\u{1f349}", "\u{1f514}", "\u2b50", "\u{1f48e}"];

interface Outcome {
	won: boolean;
	multiplier: number;
	detail: string;
}

function coinflip(choice: string): Outcome {
	const landed = randomInt(2) === 0 ? "heads" : "tails";
	return {
		won: landed === choice,
		multiplier: 2,
		detail: `The coin landed on **${landed}**.`,
	};
}

function dice(): Outcome {
	const yours = randomInt(1, 7);
	const house = randomInt(1, 7);
	return {
		won: yours > house,
		multiplier: 2,
		detail: `You rolled **${yours}**, the house rolled **${house}**.`,
	};
}

function slots(): Outcome {
	const reels = [0, 1, 2].map(() => SLOT_SYMBOLS[randomInt(SLOT_SYMBOLS.length)]!);
	const [first, second, third] = reels;
	const allMatch = first === second && second === third;
	const twoMatch = !allMatch && (first === second || second === third || first === third);

	return {
		won: allMatch || twoMatch,
		multiplier: allMatch ? 5 : twoMatch ? 1.5 : 0,
		detail: `\u{1f3b0} ${reels.join(" | ")}`,
	};
}

export default defineCommand({
	name: "gamble",
	description: "Bets your money on a game of chance.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["bet"],
	guildOnly: true,
	cooldownMs: 5_000,
	options: [
		{ name: "amount", description: "How much to bet, or `all`.", type: "string", required: true },
		{
			name: "game",
			description: "Which game to play.",
			type: "string",
			choices: [
				{ name: "coinflip", value: "coinflip" },
				{ name: "dice", value: "dice" },
				{ name: "slots", value: "slots" },
			],
		},
		{
			name: "side",
			description: "Heads or tails, for coinflip.",
			type: "string",
			choices: [
				{ name: "heads", value: "heads" },
				{ name: "tails", value: "tails" },
			],
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await requireAccount(guild.id, ctx.user.id);
		const bet = resolveAmount(ctx.options.getString("amount", true), account.wallet);
		const game = (ctx.options.getString("game") ?? "coinflip") as GameKind;

		// The debit is conditional, so two simultaneous bets cannot both be paid
		// out against the same starting balance.
		const debited = await debitWallet(guild.id, ctx.user.id, bet);
		if (!debited) throw new UserFacingError(strings.economy.insufficientWallet(bet - account.wallet));

		const outcome =
			game === "dice" ? dice() : game === "slots" ? slots() : coinflip(ctx.options.getString("side") ?? "heads");

		const payout = outcome.won ? Math.floor(bet * outcome.multiplier) : 0;
		if (payout > 0) await adjustWallet(guild.id, ctx.user.id, payout);
		await incrementCounters(guild.id, ctx.user.id, { gambled: 1 });

		const net = payout - bet;

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: outcome.won ? "You won" : "You lost",
					description: `${outcome.detail}\n\n${
						outcome.won
							? `You won **${formatNumber(net)}** on a **${formatNumber(bet)}** bet.`
							: `You lost **${formatNumber(bet)}**.`
					}`,
					fields: [
						{ name: "Game", value: game, inline: true },
						{ name: "Wallet", value: formatNumber(debited.wallet + payout), inline: true },
					],
				}),
			],
		});
	},
});
