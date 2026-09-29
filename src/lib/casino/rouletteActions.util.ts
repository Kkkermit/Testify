import { type MessageEditOptions } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import { recordCasinoPlays } from "@database/repositories/casinoStatsRepository";
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
	recentPockets,
	type RoundRecord,
	setSeatChip,
	startClock,
} from "@database/repositories/rouletteRepository";
import { rouletteSpin, rouletteStill } from "@lib/canvas/rouletteWheel.util";
import { CASINO_TIMING, ROULETTE_ROUND } from "@lib/casino/casino.constants";
import { type RouletteBet, type Roll } from "@lib/casino/casino.types";
import { payOut, type Player, takeStake } from "@lib/casino/casinoActions.util";
import { betLimitRefusal, readCasinoSettings } from "@lib/casino/casinoSettings.util";
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

/** A round as its table shows it, with the spins that came before it in this channel. */
export async function tableView(round: RoundRecord): Promise<RoundView> {
	return roundView(round, await recentPockets(round.guildId, round.channelId, ROULETTE_ROUND.history));
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
	const { wallet } = await requireAccount(seat.guildId, seat.userId);
	if (wallet < chip * bets.length) throw shortOf(chip * bets.length, wallet);

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

/** Names the stake and the wallet, so a refused bet says what the player can do instead. */
function shortOf(needed: number, wallet: number): UserFacingError {
	return new UserFacingError(
		`That needs **${formatNumber(needed)}** and you have **${formatNumber(wallet)}** in your wallet. ` +
			(wallet > 0 ? "Pick a smaller chip with the 🪙 buttons." : "Earn some first, then come back to the table."),
	);
}

/** What each of this player's chips is worth from now on, refused when the wallet cannot cover even one. */
export async function changeChip(
	seat: Seat,
	roundId: string,
	amount: string,
	now = Date.now(),
): Promise<{ chip: number; wallet: number }> {
	await openTable(roundId, seat.userId, now);
	const { wallet } = await requireAccount(seat.guildId, seat.userId);
	const chip = resolveAmount(amount, wallet);

	if (chip > wallet) {
		throw new UserFacingError(
			`A **${formatNumber(chip)}** chip is more than you have: your wallet holds **${formatNumber(wallet)}**. ` +
				"Pick a smaller one.",
		);
	}
	const refusal = betLimitRefusal(await readCasinoSettings(seat.guildId), chip);
	if (refusal !== null) throw new UserFacingError(refusal);

	if ((await setSeatChip(roundId, { userId: seat.userId, name: seat.name }, chip, now)) === null) throw closed();
	return { chip, wallet };
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

/** Pays every player from one pocket, one at a time, and only then counts the round. */
async function payEveryone(round: RoundRecord, view: RoundView, pocket: number): Promise<void> {
	const results = roundResults(view, pocket);
	for (const result of results) {
		await payOut({ guildId: round.guildId, userId: result.player.userId }, result.returned);
	}
	await recordCasinoPlays(
		results.map((result) => ({
			guildId: round.guildId,
			userId: result.player.userId,
			game: "roulette" as const,
			staked: result.staked,
			returned: result.returned,
		})),
	);
}

/**
 * Closes the table on one pocket and pays it. The claim is the guard: only the call that turns the round from
 * betting to spinning pays, so a timer and the sweep arriving together cannot pay twice.
 */
export async function spinRound(client: TestifyClient, roundId: string, roll?: Roll): Promise<RoundView | null> {
	const pocket = spinRoulette(roll);
	const round = await claimRound(roundId, pocket);
	if (round === null) return null;

	// Read before this round settles, so it shows the spins before this one.
	const history = await recentPockets(round.guildId, round.channelId, ROULETTE_ROUND.history);
	const view = roundView(round, history);
	await payEveryone(round, view, pocket);
	const spun = view.players.some((player) => staked(player) > 0);
	await finishRound(roundId, spun);

	if (!spun) {
		await editRoundMessage(client, round, roundSettledMessage(view, null));
		return view;
	}

	const spin = rouletteSpin(pocket);
	await editRoundMessage(client, round, roundSpinningMessage(view, spin.gif));
	const landed = { ...view, history: [pocket, ...history].slice(0, ROULETTE_ROUND.history) };
	client.timers.after(`roulette-reveal-${roundId}`, spin.durationMs + CASINO_TIMING.revealMarginMs, () =>
		editRoundMessage(client, round, roundSettledMessage(landed, rouletteStill(pocket))),
	);
	return view;
}

/** The host of a private table spins as soon as they are ready, rather than waiting out the countdown. */
export async function spinNow(client: TestifyClient, seat: Seat, roundId: string, roll?: Roll): Promise<RoundView> {
	const round = await findRound(roundId);
	if (round?.status !== "betting") throw closed();
	if (round.private !== true) throw new UserFacingError("Only a private table can be spun early.");
	if (round.hostId !== seat.userId) throw new UserFacingError("Only whoever opened this table can spin it.");
	if (Object.values(round.players).every((player) => player.bets.length === 0)) {
		throw new UserFacingError("Put a chip down first, then spin.");
	}

	client.timers.stop(`roulette-${roundId}`);
	const view = await spinRound(client, roundId, roll);
	if (view === null) throw closed();
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
