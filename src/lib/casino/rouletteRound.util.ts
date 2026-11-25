import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { type RouletteBet } from "@lib/casino/casino.types";
import { betWins, rouletteReturn, spotFromKey } from "@lib/casino/roulette.util";

/** A shared round of roulette as pure state: who sits where, what they bet, and what each of them gets back. */

interface RoundBet {
	bet: RouletteBet;
	amount: number;
}

export interface RoundPlayer {
	userId: string;
	name: string;
	/** Their place in the order they sat down, which picks their chip colour. */
	seat: number;
	chip: number;
	bets: RoundBet[];
}

export interface RoundView {
	id: string;
	hostId: string;
	hostName: string;
	/** Only the host may bet at a private table. */
	private: boolean;
	/** The chip a newcomer starts with, and the one Play again carries on. */
	chip: number;
	/** Null until the first bet, which starts the countdown. */
	closesAt: number | null;
	pocket: number | null;
	players: RoundPlayer[];
	/** Where the ball landed on this table before, newest first. */
	history: readonly number[];
}

export interface PlayerResult {
	player: RoundPlayer;
	staked: number;
	returned: number;
}

export function roundView(record: RoundRecord, history: readonly number[] = []): RoundView {
	const players = Object.entries(record.players)
		.sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
		.map(([userId, seat], index): RoundPlayer => ({
			userId,
			name: seat.name,
			seat: index,
			chip: seat.chip ?? record.chip,
			bets: seat.bets.flatMap((stored) => {
				const bet = spotFromKey(stored.spot);
				return bet === null ? [] : [{ bet, amount: stored.amount }];
			}),
		}));

	return {
		id: String(record._id),
		hostId: record.hostId,
		hostName: record.hostName ?? "",
		private: record.private === true,
		chip: record.chip,
		closesAt: record.closesAt === null ? null : new Date(record.closesAt).getTime(),
		pocket: record.pocket,
		players,
		history,
	};
}

export function staked(player: RoundPlayer): number {
	return player.bets.reduce((sum, placed) => sum + placed.amount, 0);
}

/** Each winning bet hands back its own amount times its return; players with nothing on the table are left out. */
export function roundResults(view: RoundView, pocket: number): PlayerResult[] {
	return view.players
		.filter((player) => player.bets.length > 0)
		.map((player) => ({
			player,
			staked: staked(player),
			returned: player.bets
				.filter((placed) => betWins(placed.bet, pocket))
				.reduce((sum, placed) => sum + placed.amount * rouletteReturn(placed.bet.kind), 0),
		}));
}

/** Reads "7", "7, 17 32" or "0 and 36"; null when nothing, or anything that is not a number on the wheel, was given. */
export function parseNumbers(raw: string): number[] | null {
	const parts = raw.split(/[\s,;/]+|\band\b/i).filter((part) => part !== "");
	if (parts.length === 0) return null;

	const numbers: number[] = [];
	for (const part of parts) {
		if (!/^\d{1,2}$/.test(part)) return null;
		const number = Number.parseInt(part, 10);
		if (number > 36) return null;
		if (!numbers.includes(number)) numbers.push(number);
	}
	return numbers;
}
