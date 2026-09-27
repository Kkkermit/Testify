import { type InteractionEditReplyOptions } from "discord.js";
import { strings } from "@config/strings";
import { type TestifyClient } from "@core/client";
import { UserFacingError, toError } from "@core/errors";
import { adjustWallet, debitWallet, incrementCounters, requireAccount } from "@database/repositories/economyRepository";
import { CASINO_TIMING } from "@lib/casino/casino.constants";
import { instantSettledMessage, instantSpinningMessage } from "@lib/casino/casinoPanel.util";
import { betLimitRefusal, readCasinoSettings } from "@lib/casino/casinoSettings.util";
import { type InstantOutcome } from "@lib/casino/instantGames.util";
import { resolveAmount } from "@lib/format/amount.util";

/** Money in and out of the casino: every bet leaves the wallet before a card is dealt, and winnings go straight back. */

export interface Player {
	guildId: string;
	userId: string;
}

/** Whatever can answer an interaction: a slash command, a prefix command or a button. */
export interface Responder {
	deferred: boolean;
	replied: boolean;
	deferReply(): Promise<unknown>;
	editReply(options: InteractionEditReplyOptions): Promise<unknown>;
}

/** Resolves `all`, `half` or a number, checks the table's limits, and takes it; the debit is conditional, so it cannot overdraw. */
export async function takeStake(player: Player, amount: string): Promise<{ bet: number; wallet: number }> {
	const account = await requireAccount(player.guildId, player.userId);
	const bet = resolveAmount(amount, account.wallet);

	const refusal = betLimitRefusal(await readCasinoSettings(player.guildId), bet);
	if (refusal !== null) throw new UserFacingError(refusal);

	const debited = await debitWallet(player.guildId, player.userId, bet);
	if (debited === null)
		throw new UserFacingError(strings.economy.insufficientWallet(Math.max(1, bet - account.wallet)));

	await incrementCounters(player.guildId, player.userId, { gambled: 1 });

	return { bet, wallet: debited.wallet };
}

/** Takes a further sum for a hand already on the table, or null when the wallet cannot cover it. */
export async function takeMore(player: Player, amount: number): Promise<number | null> {
	const debited = await debitWallet(player.guildId, player.userId, amount);

	return debited?.wallet ?? null;
}

/** Hands winnings back and answers with the wallet after, or null when there was nothing to pay. */
export async function payOut(player: Player, amount: number): Promise<number | null> {
	if (amount <= 0) return null;

	return (await adjustWallet(player.guildId, player.userId, amount)).wallet;
}

let reveals = 0;

/** Players whose last game is still being drawn: a render takes a moment, and a player gets one at a time per server. */
const drawing = new Set<string>();

/**
 * Takes the stake, settles and pays the game, then shows it being played: the animation first, swapped for the
 * settled picture once it has had time to run, so a client that loops the GIF still ends on the result.
 */
export async function playInstant(
	responder: Responder,
	client: TestifyClient,
	player: Player,
	amount: string,
	settle: (stake: number) => InstantOutcome,
): Promise<void> {
	const key = `${player.guildId}:${player.userId}`;
	if (drawing.has(key)) throw new UserFacingError("Your last game is still being dealt. Give it a second.");

	const deal = async (): Promise<{ outcome: InstantOutcome; bet: number; wallet: number; durationMs: number }> => {
		const stake = await takeStake(player, amount);
		if (!responder.deferred && !responder.replied) await responder.deferReply();

		const outcome = settle(stake.bet);
		const wallet = (await payOut(player, outcome.returned)) ?? stake.wallet;

		const spin = outcome.animate();
		await responder.editReply(instantSpinningMessage(outcome, stake.bet, spin.gif));

		return { outcome, bet: stake.bet, wallet, durationMs: spin.durationMs };
	};

	drawing.add(key);
	const dealt = await deal().finally(() => drawing.delete(key));
	const { outcome, bet, wallet } = dealt;

	reveals += 1;
	client.timers.after(`casino-reveal-${reveals}`, dealt.durationMs + CASINO_TIMING.revealMarginMs, async () => {
		try {
			await responder.editReply(instantSettledMessage(outcome, bet, wallet, player.userId, outcome.still()));
		} catch (error) {
			// A message deleted mid-spin is not a failure; the money was settled before it was shown.
			client.logger.debug({ err: toError(error) }, "[CASINO] Could not reveal a settled game");
		}
	});
}
