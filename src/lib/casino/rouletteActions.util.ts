import { type MessageEditOptions } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import { requireAccount } from "@database/repositories/economyRepository";
import {
	addBets,
	attachRoundMessage,
	claimRound,
	clearBets,
	findRound,
	finishRound,
	openRound as insertRound,
	overdueRounds,
	type RoundRecord,
	setSeatChip,
	startClock,
} from "@database/repositories/rouletteRepository";
import { rouletteSpin, rouletteStill } from "@lib/canvas/rouletteWheel.util";
import { CASINO_TIMING, ROULETTE_ROUND } from "@lib/casino/casino.constants";
import { type RouletteBet, type Roll } from "@lib/casino/casino.types";
import { payOut, type Player, takeStake } from "@lib/casino/casinoActions.util";
import { spinRoulette, spotKey } from "@lib/casino/roulette.util";
import {
	roundResults,
	roundSettledMessage,
	roundSpinningMessage,
	type RoundView,
	roundView,
	staked,
} from "@lib/casino/rouletteRound.util";
import { resolveAmount } from "@lib/format/amount.util";
import { escapeMarkdown, formatNumber } from "@lib/format/format.util";
import { type CasinoSettings } from "@testify/shared";

/** The shared roulette round's money and timing: stakes go as chips land, one spin, and everybody paid from it. */

export interface Seat extends Player {
	name: string;
}

const closed = (): UserFacingError => new UserFacingError("Betting on that round has closed. Wait for the next one.");

async function editRoundMessage(client: TestifyClient, round: RoundRecord, message: MessageEditOptions): Promise<void> {
	if (round.messageId === null) return;

	try {
		const channel = await client.channels.fetch(round.channelId);
		if (channel?.isTextBased() === true) await channel.messages.edit(round.messageId, message);
	} catch (error) {
		// A message deleted mid-round is not a failure; the money was settled before it was shown.
		client.logger.debug({ err: toError(error) }, "[CASINO] Could not update a roulette round's message");
	}
}

/** Who opened a table, and whether anybody else may bet at it. */
export interface TableHost {
	userId: string;
	name: string;
	private: boolean;
}

/** Opens a table that waits for its first bet; null when one is already open on that message. */
export async function openRound(
	where: { guildId: string; channelId: string; messageId: string | null },
	host: TableHost,
	chip: number,
	now = Date.now(),
): Promise<RoundRecord | null> {
	return insertRound({
		...where,
		hostId: host.userId,
		hostName: host.name,
		private: host.private,
		chip,
		closesAt: null,
		expiresAt: new Date(now + ROULETTE_ROUND.keepMs),
	});
}

/** The chip a new table starts with: the usual one, moved inside whatever limits the server set. */
export function openingChip(settings: Pick<CasinoSettings, "minBet" | "maxBet">): number {
	const chip = Math.max(ROULETTE_ROUND.defaultChip, settings.minBet);
	return settings.maxBet === null ? chip : Math.min(chip, settings.maxBet);
}

/** The first bet starts the countdown; only the call that started it sets the timer, so one round spins once. */
async function startCountdown(client: TestifyClient, roundId: string, now: number): Promise<void> {
	const closesAt = new Date(now + ROULETTE_ROUND.bettingMs);
	const started = await startClock(roundId, closesAt, new Date(closesAt.getTime() + ROULETTE_ROUND.keepMs));

	if (started) {
		client.timers.after(`roulette-${roundId}`, ROULETTE_ROUND.bettingMs, async () => {
			await spinRound(client, roundId);
		});
	}
}

export async function rememberRoundMessage(roundId: string, messageId: string): Promise<void> {
	await attachRoundMessage(roundId, messageId);
}

/** The round, or a refusal that says why this player cannot bet on it. */
async function openTable(roundId: string, userId: string, now: number): Promise<RoundRecord> {
	const round = await findRound(roundId);
	if (round?.status !== "betting") throw closed();
	if (round.private === true && round.hostId !== userId) {
		const host = round.hostName ? `${escapeMarkdown(round.hostName)}'s` : "somebody else's";
		throw new UserFacingError(`That is ${host} private table. Open your own with \`/casino roulette\`.`);
	}
	if (round.closesAt !== null && new Date(round.closesAt).getTime() <= now) throw closed();
	return round;
}

/** Puts one chip on each spot, stake first; if the table closed or filled in between, the stake comes straight back. */
export async function placeBets(
	client: TestifyClient,
	seat: Seat,
	roundId: string,
	bets: readonly RouletteBet[],
	now = Date.now(),
): Promise<RoundRecord> {
	const round = await openTable(roundId, seat.userId, now);
	const placed = round.players[seat.userId]?.bets.length ?? 0;
	const room = ROULETTE_ROUND.maxBets - placed;

	if (room <= 0) throw new UserFacingError(`You already have ${String(ROULETTE_ROUND.maxBets)} bets on this round.`);
	if (bets.length > room) {
		throw new UserFacingError(`You can place ${String(room)} more ${room === 1 ? "bet" : "bets"} on this round.`);
	}

	const chip = round.players[seat.userId]?.chip ?? round.chip;
	const { bet: total } = await takeStake(seat, String(chip * bets.length));
	if (round.closesAt === null) await startCountdown(client, roundId, now);

	const updated = await addBets(
		roundId,
		{ userId: seat.userId, name: seat.name },
		bets.map((bet) => ({ spot: spotKey(bet), amount: chip })),
		ROULETTE_ROUND.maxBets,
		now,
	);
	if (updated === null) {
		await payOut(seat, total);
		throw new UserFacingError("Betting closed, or your bets filled up, before that one landed. Your chips are back.");
	}

	return updated;
}

/** What each of this player's chips is worth from now on; bets already down keep their own amount. */
export async function changeChip(seat: Seat, roundId: string, amount: string, now = Date.now()): Promise<number> {
	await openTable(roundId, seat.userId, now);
	const account = await requireAccount(seat.guildId, seat.userId);
	const chip = resolveAmount(amount, account.wallet);

	if ((await setSeatChip(roundId, { userId: seat.userId, name: seat.name }, chip, now)) === null) throw closed();
	return chip;
}

/** Takes this player's chips off an open table and hands them back. */
export async function clearMyBets(seat: Seat, roundId: string): Promise<{ round: RoundRecord; refunded: number }> {
	const before = await clearBets(roundId, seat.userId);
	if (before === null) {
		const round = await findRound(roundId);
		if (round?.status !== "betting") throw closed();
		throw new UserFacingError("You have no chips on this round.");
	}

	const refunded = (before.players[seat.userId]?.bets ?? []).reduce((sum, placed) => sum + placed.amount, 0);
	await payOut(seat, refunded);

	const round = await findRound(roundId);
	if (round === null) throw closed();
	return { round, refunded };
}

export function refundLine(refunded: number): string {
	return `Your ${formatNumber(refunded)} is back in your wallet.`;
}

/** Pays every player from one pocket, one at a time. */
async function payEveryone(round: RoundRecord, view: RoundView, pocket: number): Promise<void> {
	for (const result of roundResults(view, pocket)) {
		await payOut({ guildId: round.guildId, userId: result.player.userId }, result.returned);
	}
}

/**
 * Closes the table on one pocket and pays it. The claim is the guard: only the call that turns the round from
 * betting to spinning pays, so a timer and the sweep arriving together cannot pay twice.
 */
export async function spinRound(client: TestifyClient, roundId: string, roll?: Roll): Promise<RoundView | null> {
	const pocket = spinRoulette(roll);
	const round = await claimRound(roundId, pocket);
	if (round === null) return null;

	const view = roundView(round);
	await payEveryone(round, view, pocket);
	await finishRound(roundId);

	if (view.players.every((player) => staked(player) === 0)) {
		await editRoundMessage(client, round, roundSettledMessage(view, null));
		return view;
	}

	const spin = rouletteSpin(pocket);
	await editRoundMessage(client, round, roundSpinningMessage(view, spin.gif));
	client.timers.after(`roulette-reveal-${roundId}`, spin.durationMs + CASINO_TIMING.revealMarginMs, () =>
		editRoundMessage(client, round, roundSettledMessage(view, rouletteStill(pocket))),
	);
	return view;
}

/** Spins every round a restart left open past its close, so no stake sits on a table nobody will turn. */
export async function spinOverdueRounds(client: TestifyClient, now = Date.now()): Promise<void> {
	const rounds = await overdueRounds(new Date(now - ROULETTE_ROUND.overdueMs), 10);

	// One at a time, so a burst of overdue rounds is a trickle of payouts rather than a spike of writes.
	for (const round of rounds) {
		const settled = await spinRound(client, String(round._id));
		if (settled !== null) client.logger.debug({ guildId: round.guildId }, "[CASINO] Spun an overdue roulette round");
	}
}
