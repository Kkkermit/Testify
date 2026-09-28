import { randomInt } from "node:crypto";
import { coinStill, coinToss, diceRoll, diceStill } from "@lib/canvas/chanceArt.util";
import { rouletteBoard } from "@lib/canvas/rouletteTable.util";
import { rouletteSpin, rouletteStill } from "@lib/canvas/rouletteWheel.util";
import { slotsSpin, slotsStill } from "@lib/canvas/slotMachine.util";
import {
	type CoinSide,
	type DiceBet,
	type Reels,
	type RouletteBet,
	type Roll,
	type SlotSymbol,
} from "@lib/casino/casino.types";
import { COINFLIP_RETURN, DICE_BET_LABELS, DICE_RETURNS, diceWins, flipCoin, rollDice } from "@lib/casino/chance.util";
import {
	betLabel,
	decodeSpots,
	encodeSpots,
	isRouletteBetKind,
	pocketColour,
	settleSpots,
	spinRoulette,
	spotsLine,
} from "@lib/casino/roulette.util";
import { slotsReturn, spinSlots } from "@lib/casino/slots.util";
import { formatNumber } from "@lib/format/format.util";
import { type CasinoGame } from "@testify/shared";

/** The games settled in one go: the result is decided and paid first, and the picture shows what already happened. */

export type InstantGame = Extract<CasinoGame, "roulette" | "slots" | "coinflip" | "dice">;

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
	/** What Play again stakes, when it is not the whole bet: roulette carries its chip, not the table's total. */
	againStake?: number;
	/** The file name the pictures are attached under. */
	file: string;
	animate(): { gif: Buffer; durationMs: number };
	still(): Buffer;
	/** A second picture under the first: roulette's layout, with every chip that was on it. */
	board?(): Buffer;
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

/** Every spot gets an equal share of the stake, so a table of five 100 chips is a stake of 500. */
export function rouletteOutcome(bets: readonly RouletteBet[], stake: number, roll: Roll = randomInt): InstantOutcome {
	const chip = Math.floor(stake / Math.max(1, bets.length));
	const pocket = spinRoulette(roll);
	const { returned, winners } = settleSpots(bets, chip, pocket);
	const many = bets.length > 1;

	return {
		game: "roulette",
		betLine: many ? `${spotsLine(bets)} · ${formatNumber(chip)} each` : betLabel(bets[0] ?? { kind: "red" }),
		returned,
		result:
			`The ball landed on **${pocket} ${pocketColour(pocket)}**.` +
			(many ? ` ${String(winners.length)} of your ${String(bets.length)} bets won.` : ""),
		again: `t${encodeSpots(bets)}`,
		againStake: chip,
		file: "roulette",
		animate: () => rouletteSpin(pocket),
		still: () => rouletteStill(pocket),
		board: () => rouletteBoard({ bets, chip, pocket }),
	};
}

/** The bets a roulette Play again carries: `t` and a mask of spots, or one bet from a button made before tables. */
export function rouletteAgainBets(again: string): RouletteBet[] | null {
	if (again.startsWith("t")) {
		const bets = decodeSpots(again.slice(1));
		return bets === null || bets.length === 0 ? null : bets;
	}

	const number = /^n(\d{1,2})$/.exec(again);
	if (number !== null) {
		const pocket = Number.parseInt(number[1]!, 10);
		return pocket <= 36 ? [{ kind: "number", number: pocket }] : null;
	}

	return isRouletteBetKind(again) && again !== "number" ? [{ kind: again }] : null;
}

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
		case "roulette": {
			const bets = rouletteAgainBets(again);
			return bets === null ? null : rouletteOutcome(bets, stake * bets.length, roll);
		}
		case "slots":
			return again === "line" ? slotsOutcome(stake, roll) : null;
		case "coinflip":
			return again === "heads" || again === "tails" ? coinflipOutcome(again, stake, roll) : null;
		case "dice":
			return again === "under" || again === "seven" || again === "over" ? diceOutcome(again, stake, roll) : null;
	}
}

export function isInstantGame(game: string): game is InstantGame {
	return game === "roulette" || game === "slots" || game === "coinflip" || game === "dice";
}
