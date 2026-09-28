import { randomInt } from "node:crypto";
import { coinStill, coinToss, diceRoll, diceStill } from "@lib/canvas/chanceArt.util";
import { slotsSpin, slotsStill } from "@lib/canvas/slotMachine.util";
import { type CoinSide, type DiceBet, type Reels, type Roll, type SlotSymbol } from "@lib/casino/casino.types";
import { COINFLIP_RETURN, DICE_BET_LABELS, DICE_RETURNS, diceWins, flipCoin, rollDice } from "@lib/casino/chance.util";
import { slotsReturn, spinSlots } from "@lib/casino/slots.util";
import { type CasinoGame } from "@testify/shared";

/** The games settled in one go: the result is decided and paid first, and the picture shows what already happened. */

export type InstantGame = Extract<CasinoGame, "slots" | "coinflip" | "dice">;

export interface InstantOutcome {
	game: InstantGame;
	/** What was bet on, in words, e.g. "Red" or "Exactly 7". */
	betLine: string;
	/** Everything handed back, stake included; zero on a loss. */
	returned: number;
	/** What happened, in words. */
	result: string;
	/** The call, packed small enough to ride in a Play again button. */
	again: string;
	/** The file name the pictures are attached under. */
	file: string;
	animate(): { gif: Buffer; durationMs: number };
	still(): Buffer;
}

const SYMBOL_NAMES: Record<SlotSymbol, string> = {
	cherry: "Cherry",
	lemon: "Lemon",
	bell: "Bell",
	bar: "BAR",
	star: "Star",
	seven: "Seven",
	diamond: "Diamond",
};

export function slotsOutcome(stake: number, roll: Roll = randomInt): InstantOutcome {
	const reels: Reels = spinSlots(roll);
	const multiple = slotsReturn(reels);

	return {
		game: "slots",
		betLine: "One line",
		returned: stake * multiple,
		result:
			multiple > 0
				? `${reels.map((symbol) => SYMBOL_NAMES[symbol]).join(" · ")} pays **${multiple}×**.`
				: `${reels.map((symbol) => SYMBOL_NAMES[symbol]).join(" · ")} pays nothing.`,
		again: "line",
		file: "slots",
		animate: () => slotsSpin(reels),
		still: () => slotsStill(reels),
	};
}

export function coinflipOutcome(call: CoinSide, stake: number, roll: Roll = randomInt): InstantOutcome {
	const landed = flipCoin(roll);

	return {
		game: "coinflip",
		betLine: call === "heads" ? "Heads" : "Tails",
		returned: landed === call ? Math.floor(stake * COINFLIP_RETURN) : 0,
		result: `The coin landed on **${landed}**.`,
		again: call,
		file: "coinflip",
		animate: () => coinToss(landed),
		still: () => coinStill(landed),
	};
}

export function diceOutcome(bet: DiceBet, stake: number, roll: Roll = randomInt): InstantOutcome {
	const dice = rollDice(roll);

	return {
		game: "dice",
		betLine: DICE_BET_LABELS[bet],
		returned: diceWins(bet, dice) ? stake * DICE_RETURNS[bet] : 0,
		result: `The dice show **${dice[0]}** and **${dice[1]}**, for **${dice[0] + dice[1]}**.`,
		again: bet,
		file: "dice",
		animate: () => diceRoll(dice),
		still: () => diceStill(dice),
	};
}

/** Reads a call back out of a Play again button; null for anything the button could not have carried. */
export function outcomeFor(
	game: InstantGame,
	again: string,
	stake: number,
	roll: Roll = randomInt,
): InstantOutcome | null {
	switch (game) {
		case "slots":
			return again === "line" ? slotsOutcome(stake, roll) : null;
		case "coinflip":
			return again === "heads" || again === "tails" ? coinflipOutcome(again, stake, roll) : null;
		case "dice":
			return again === "under" || again === "seven" || again === "over" ? diceOutcome(again, stake, roll) : null;
	}
}

export function isInstantGame(game: string): game is InstantGame {
	return game === "slots" || game === "coinflip" || game === "dice";
}
