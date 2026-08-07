import { type LotteryRecord } from "@database/models/lottery.schema";
import { getLottery, intervalFor, saveLottery } from "@database/repositories/lotteryRepository";
import { type LotteryPatch, type LotterySettings, lotteryBlocked } from "@testify/shared";

const DEFAULTS = { entryFee: 100, basePrizePool: 0, maxWinners: 1, frequency: "weekly" } as const;

export function normaliseLottery(record: LotteryRecord | null): LotterySettings {
	const entries = record?.entries ?? [];

	return {
		enabled: record?.isActive ?? false,
		frozen: record?.isFrozen ?? false,
		entryFee: record?.entryFee ?? DEFAULTS.entryFee,
		basePrizePool: record?.basePrizePool ?? DEFAULTS.basePrizePool,
		maxWinners: record?.maxWinners ?? DEFAULTS.maxWinners,
		frequency: record?.frequency ?? DEFAULTS.frequency,
		announcementChannelId: record?.announcementChannelId ?? null,
		prizePool: record?.prizePool ?? 0,
		ticketsSold: entries.reduce((total, entry) => total + entry.tickets, 0),
		entrants: entries.length,
		nextDrawAt: record?.nextDrawTime.toISOString() ?? null,
		history: (record?.history ?? [])
			.slice(-5)
			.reverse()
			.map((draw) => ({
				at: draw.drawTime.toISOString(),
				prizePool: draw.totalPrizePool,
				tickets: draw.totalTickets,
				winners: draw.winners.map((winner) => ({ userTag: winner.userTag, prizeAmount: winner.prizeAmount })),
			})),
	};
}

export async function readLottery(guildId: string): Promise<LotterySettings> {
	return normaliseLottery(await getLottery(guildId));
}

/**
 * Changing the frequency moves the next draw, because the stored time was computed from the old interval and
 * would otherwise leave a weekly lottery drawing in an hour.
 */
export async function applyLottery(
	guildId: string,
	patch: LotteryPatch,
	actorId: string,
): Promise<{ settings: LotterySettings } | { problem: string }> {
	const current = await readLottery(guildId);
	const next: LotterySettings = {
		...current,
		entryFee: patch.entryFee ?? current.entryFee,
		basePrizePool: patch.basePrizePool ?? current.basePrizePool,
		maxWinners: patch.maxWinners ?? current.maxWinners,
		frequency: patch.frequency ?? current.frequency,
		announcementChannelId: patch.announcementChannelId ?? current.announcementChannelId,
		frozen: patch.frozen ?? current.frozen,
	};

	const problem = lotteryBlocked(next);
	if (problem !== null) return { problem };

	const rescheduled = patch.frequency !== undefined && patch.frequency !== current.frequency;
	const nextDrawTime =
		rescheduled || current.nextDrawAt === null ? nextDraw(next.frequency) : new Date(current.nextDrawAt);

	await saveLottery(guildId, {
		isActive: true,
		isFrozen: next.frozen,
		entryFee: next.entryFee,
		basePrizePool: next.basePrizePool,
		maxWinners: next.maxWinners,
		frequency: next.frequency,
		announcementChannelId: next.announcementChannelId ?? "",
		nextDrawTime,
		lastModifiedBy: actorId,
	});

	return { settings: { ...next, enabled: true, nextDrawAt: nextDrawTime.toISOString() } };
}

export function nextDraw(frequency: LotterySettings["frequency"], from = Date.now()): Date {
	return new Date(from + intervalFor(frequency));
}
