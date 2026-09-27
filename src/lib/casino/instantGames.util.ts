import { randomInt } from "node:crypto";
import { coinStill, coinToss, diceRoll, diceStill } from "@lib/canvas/chanceArt.util";
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
	betWins,
	isRouletteBetKind,
	pocketColour,
	rouletteReturn,
	spinRoulette,
} from "@lib/casino/roulette.util";
import { slotsReturn, spinSlots } from "@lib/casino/slots.util";
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

export function rouletteOutcome(bet: RouletteBet, stake: number, roll: Roll = randomInt): InstantOutcome {
	const pocket = spinRoulette(roll);
	const won = betWins(bet, pocket);

	return {
		game: "roulette",
		betLine: betLabel(bet),
		returned: won ? stake * rouletteReturn(bet.kind) : 0,
		result: `The ball landed on **${pocket} ${pocketColour(pocket)}**.`,
		again: bet.kind === "number" ? `n${bet.number ?? 0}` : bet.kind,
		file: "roulette",
		animate: () => rouletteSpin(pocket),
		still: () => rouletteStill(pocket),
	};
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
			const number = /^n(\d{1,2})$/.exec(again);
			if (number !== null) {
				const pocket = Number.parseInt(number[1]!, 10);
				return pocket <= 36 ? rouletteOutcome({ kind: "number", number: pocket }, stake, roll) : null;
			}
			return isRouletteBetKind(again) && again !== "number" ? rouletteOutcome({ kind: again }, stake, roll) : null;
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
