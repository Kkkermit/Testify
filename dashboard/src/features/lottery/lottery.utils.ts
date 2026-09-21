import { LOTTERY_LIMITS, type LotteryFrequency, type LotterySettings, lotteryBlocked } from "@testify/shared";
import { type TFunction } from "i18next";

export interface Draft {
	entryFee: number;
	basePrizePool: number;
	maxWinners: number;
	frequency: LotteryFrequency;
	announcementChannelId: string | null;
}

export function draftOf(settings: LotterySettings): Draft {
	return {
		entryFee: settings.entryFee,
		basePrizePool: settings.basePrizePool,
		maxWinners: settings.maxWinners,
		frequency: settings.frequency,
		announcementChannelId: settings.announcementChannelId,
	};
}

export function isDirty(draft: Draft, settings: LotterySettings): boolean {
	const saved = draftOf(settings);

	return (Object.keys(saved) as (keyof Draft)[]).some((field) => draft[field] !== saved[field]);
}

export function draftProblem(draft: Draft, t: TFunction): string | null {
	const { entryFee, basePrizePool, maxWinners } = draft;

	if (
		!Number.isInteger(maxWinners) ||
		maxWinners < LOTTERY_LIMITS.minWinners ||
		maxWinners > LOTTERY_LIMITS.maxWinners
	) {
		return t("lottery.winnersBetween", { min: LOTTERY_LIMITS.minWinners, max: LOTTERY_LIMITS.maxWinners });
	}
	if (!Number.isInteger(basePrizePool) || basePrizePool < 0 || basePrizePool > LOTTERY_LIMITS.maxBasePool) {
		return t("lottery.potTooBig", { max: LOTTERY_LIMITS.maxBasePool.toLocaleString() });
	}
	if (Number.isInteger(entryFee) && entryFee > LOTTERY_LIMITS.maxEntryFee) {
		return t("lottery.ticketTooDear", { max: LOTTERY_LIMITS.maxEntryFee.toLocaleString() });
	}

	return lotteryBlocked(draft);
}

/** Changing how often the draw runs moves the next one, so the form says that before the admin presses Save. */
export function reschedules(draft: Draft, settings: LotterySettings): boolean {
	return draft.frequency !== settings.frequency;
}

/** More winners than tickets sold means somebody wins nothing, which reads as the draw having failed. */
export function winnersWarning(draft: Draft, settings: LotterySettings, t: TFunction): string | null {
	if (settings.ticketsSold === 0 || draft.maxWinners <= settings.ticketsSold) return null;

	return t("lottery.moreWinnersThanTickets", { tickets: settings.ticketsSold, winners: draft.maxWinners });
}
