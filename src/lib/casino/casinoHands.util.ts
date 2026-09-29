import { UserFacingError } from "@core/errors";
import { advanceHand, claimHand, findHand, type HandRecord, openHand } from "@database/repositories/casinoRepository";
import { recordCasinoPlays } from "@database/repositories/casinoStatsRepository";
import {
	applyBlackjack,
	blackjackReturn,
	canDouble,
	dealBlackjack,
	finishBlackjack,
	openingVerdict,
} from "@lib/casino/blackjack.util";
import { CASINO_TIMING } from "@lib/casino/casino.constants";
import {
	type BlackjackAction,
	type BlackjackState,
	type HeldGame,
	type HiLoGuess,
	type HiLoState,
	type Roll,
} from "@lib/casino/casino.types";
import { payOut, type Player, takeMore, takeStake } from "@lib/casino/casinoActions.util";
import { type BlackjackView, type HiLoView } from "@lib/casino/casinoPanel.util";
import { guessHiLo, HILO_MAX_MULTIPLIER, hiloPayout, hiloStep, startHiLo } from "@lib/casino/hilo.util";
import { formatNumber } from "@lib/format/format.util";

/** The card games that span several presses; each hand lives in the database from the deal to the payout. */

const GAME_NAMES: Record<HeldGame, string> = { blackjack: "blackjack", hilo: "hi-lo" };

function idleUntil(): Date {
	return new Date(Date.now() + CASINO_TIMING.handIdleMs);
}

const alreadyPlayed = (): UserFacingError =>
	new UserFacingError("That hand has already moved on. Use the buttons on its newest message.");

async function heldHand(player: Player, game: HeldGame): Promise<HandRecord> {
	const hand = await findHand(player.guildId, player.userId, game);
	if (hand === null) throw new UserFacingError("That hand has already finished.");

	return hand;
}

/** Refuses before any money moves, then lets the unique index settle a race between two starts. */
async function openHeld(
	player: Player,
	game: HeldGame,
	amount: string,
	state: (bet: number) => unknown,
): Promise<{ hand: HandRecord; bet: number }> {
	if ((await findHand(player.guildId, player.userId, game)) !== null) {
		throw new UserFacingError(`You already have a ${GAME_NAMES[game]} hand on the table here. Finish that one first.`);
	}

	const stake = await takeStake(player, amount);
	const hand = await openHand({
		...player,
		game,
		bet: stake.bet,
		staked: stake.bet,
		state: state(stake.bet),
		expiresAt: idleUntil(),
	});

	if (hand === null) {
		await payOut(player, stake.bet);
		throw new UserFacingError(`You already have a ${GAME_NAMES[game]} hand on the table here. Finish that one first.`);
	}

	return { hand, bet: stake.bet };
}

async function settleBlackjack(
	player: Player,
	hand: HandRecord,
	state: BlackjackState,
	staked: number,
	extra: number,
	auto = false,
): Promise<BlackjackView> {
	const finished = finishBlackjack(state);
	const claimed = await claimHand(hand);

	if (claimed === null) {
		await payOut(player, extra);
		throw alreadyPlayed();
	}

	const returned = blackjackReturn(finished.verdict, staked);
	const wallet = await payOut(player, returned);
	await recordCasinoPlays([{ ...player, game: "blackjack", staked, returned }]);

	return { state: finished.state, bet: hand.bet, staked, verdict: finished.verdict, returned, wallet, auto };
}

/** Deals a hand; a natural on either side settles on the spot, as the dealer checks for one before anybody acts. */
export async function startBlackjack(
	player: Player,
	amount: string,
	roll?: Roll,
): Promise<{ view: BlackjackView; hand: HandRecord | null }> {
	const dealt = dealBlackjack(roll);
	const { hand, bet } = await openHeld(player, "blackjack", amount, () => dealt);

	const opening = openingVerdict(dealt);
	if (opening === null)
		return { hand, view: { state: dealt, bet, staked: bet, verdict: null, returned: 0, wallet: null } };

	const claimed = await claimHand(hand);
	if (claimed === null) throw alreadyPlayed();

	const returned = blackjackReturn(opening, bet);
	const wallet = await payOut(player, returned);
	await recordCasinoPlays([{ ...player, game: "blackjack", staked: bet, returned }]);

	return { hand: null, view: { state: dealt, bet, staked: bet, verdict: opening, returned, wallet } };
}

export async function playBlackjack(player: Player, action: BlackjackAction): Promise<BlackjackView> {
	const hand = await heldHand(player, "blackjack");
	const state = hand.state as BlackjackState;
	let extra = 0;

	if (action === "double") {
		if (!canDouble(state)) throw new UserFacingError("You can only double down on your first two cards.");
		if ((await takeMore(player, hand.bet)) === null) {
			throw new UserFacingError(
				`Doubling down takes another **${formatNumber(hand.bet)}**, and your wallet cannot cover it.`,
			);
		}
		extra = hand.bet;
	}

	const applied = applyBlackjack(state, action);
	const staked = hand.staked + extra;

	if (applied.done) return settleBlackjack(player, hand, applied.state, staked, extra);

	if (!(await advanceHand(hand, { state: applied.state, staked, expiresAt: idleUntil() }))) {
		await payOut(player, extra);
		throw alreadyPlayed();
	}

	return { state: applied.state, bet: hand.bet, staked, verdict: null, returned: 0, wallet: null };
}

export async function startHiLoHand(
	player: Player,
	amount: string,
	roll?: Roll,
): Promise<{ view: HiLoView; hand: HandRecord }> {
	const state = startHiLo(roll);
	const { hand, bet } = await openHeld(player, "hilo", amount, () => state);

	return { hand, view: { state, staked: bet, phase: "open", returned: 0, wallet: null, lastCall: null } };
}

async function cashOutHand(player: Player, hand: HandRecord, state: HiLoState, auto = false): Promise<HiLoView> {
	if ((await claimHand(hand)) === null) throw alreadyPlayed();

	const returned = hiloPayout(state, hand.staked);
	const wallet = await payOut(player, returned);
	await recordCasinoPlays([{ ...player, game: "hilo", staked: hand.staked, returned }]);

	return { state, staked: hand.staked, phase: "cashed", returned, wallet, lastCall: true, auto };
}

export async function callHiLo(player: Player, guess: HiLoGuess, roll?: Roll): Promise<HiLoView> {
	const hand = await heldHand(player, "hilo");
	const state = hand.state as HiLoState;

	if (hiloStep(state.current, guess) === null) {
		throw new UserFacingError(`Nothing is ${guess} than ${state.current.rank}. Try the other call, or cash out.`);
	}

	const result = guessHiLo(state, guess, roll);

	if (!result.won) {
		if ((await claimHand(hand)) === null) throw alreadyPlayed();
		await recordCasinoPlays([{ ...player, game: "hilo", staked: hand.staked, returned: 0 }]);
		return { state: result.state, staked: hand.staked, phase: "lost", returned: 0, wallet: null, lastCall: false };
	}

	// At the cap the pot cannot grow, so it is banked rather than left on a table that can only lose it.
	if (result.state.multiplier >= HILO_MAX_MULTIPLIER) return cashOutHand(player, hand, result.state);

	if (!(await advanceHand(hand, { state: result.state, expiresAt: idleUntil() }))) throw alreadyPlayed();

	return { state: result.state, staked: hand.staked, phase: "open", returned: 0, wallet: null, lastCall: true };
}

export async function cashOutHiLo(player: Player): Promise<HiLoView> {
	const hand = await heldHand(player, "hilo");

	return cashOutHand(player, hand, hand.state as HiLoState);
}

export type SettledHand = { game: "blackjack"; view: BlackjackView } | { game: "hilo"; view: HiLoView };

/** Plays out a hand its player walked away from: blackjack stands, hi-lo banks the pot. */
export async function settleAbandoned(hand: HandRecord): Promise<SettledHand> {
	const player = { guildId: hand.guildId, userId: hand.userId };

	if (hand.game === "blackjack") {
		return {
			game: "blackjack",
			view: await settleBlackjack(player, hand, hand.state as BlackjackState, hand.staked, 0, true),
		};
	}

	return { game: "hilo", view: await cashOutHand(player, hand, hand.state as HiLoState, true) };
}
