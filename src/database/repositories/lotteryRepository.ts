import { DAY_MS, HOUR_MS, WEEK_MS } from "@config/constants";
import { Lottery, type LotteryDraw, type LotteryFrequency, type LotteryRecord } from "@database/models/lottery";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export function intervalFor(frequency: LotteryFrequency): number {
	switch (frequency) {
		case "hourly":
			return HOUR_MS;
		case "daily":
			return DAY_MS;
		case "weekly":
			return WEEK_MS;
	}
}

export async function getLottery(guildId: string): Promise<LotteryRecord | null> {
	return Lottery.findOne({ guildId }).lean<LotteryRecord>().exec();
}

export async function saveLottery(
	guildId: string,
	fields: Partial<Omit<LotteryRecord, "guildId" | "entries" | "history" | "createdAt" | "updatedAt">> & {
		lastModifiedBy: string;
	},
): Promise<LotteryRecord> {
	return Lottery.findOneAndUpdate(
		{ guildId },
		{ $set: fields, $setOnInsert: { guildId, createdBy: fields.lastModifiedBy } },
		UPSERT,
	).exec() as Promise<LotteryRecord>;
}

export async function deleteLottery(guildId: string): Promise<boolean> {
	return (await Lottery.deleteOne({ guildId }).exec()).deletedCount > 0;
}

/** Adds tickets and grows the pool in one write, so entries cannot desynchronise from the pot. */
export async function addEntry(
	guildId: string,
	entry: { userId: string; userTag: string; tickets: number },
	feePaid: number,
): Promise<LotteryRecord | null> {
	const existing = await Lottery.findOneAndUpdate(
		{ guildId, isActive: true, isFrozen: false, "entries.userId": entry.userId },
		{ $inc: { "entries.$.tickets": entry.tickets, prizePool: feePaid } },
		{ new: true, lean: true },
	)
		.lean<LotteryRecord>()
		.exec();

	if (existing) return existing;

	return Lottery.findOneAndUpdate(
		{ guildId, isActive: true, isFrozen: false },
		{
			$push: { entries: { ...entry, enteredAt: new Date() } },
			$inc: { prizePool: feePaid },
		},
		{ new: true, lean: true },
	)
		.lean<LotteryRecord>()
		.exec();
}

/**
 * Claims a due draw by pushing `nextDrawTime` forward in the same query that
 * selects it. A slow draw can no longer overlap the next tick and pay out twice.
 */
export async function claimDueDraw(now: Date = new Date()): Promise<LotteryRecord | null> {
	const due = await Lottery.findOne({ isActive: true, isFrozen: false, nextDrawTime: { $lte: now } })
		.lean<LotteryRecord>()
		.exec();
	if (!due) return null;

	const nextDrawTime = new Date(now.getTime() + intervalFor(due.frequency));

	return Lottery.findOneAndUpdate(
		{ guildId: due.guildId, nextDrawTime: due.nextDrawTime },
		{ $set: { nextDrawTime } },
		{ new: false, lean: true },
	)
		.lean<LotteryRecord>()
		.exec();
}

export async function recordDraw(guildId: string, draw: LotteryDraw, basePrizePool: number): Promise<void> {
	await Lottery.updateOne(
		{ guildId },
		{ $push: { history: { $each: [draw], $slice: -25 } }, $set: { entries: [], prizePool: basePrizePool } },
	).exec();
}

export async function listActiveLotteries(): Promise<LotteryRecord[]> {
	return Lottery.find({ isActive: true }).lean<LotteryRecord[]>().exec();
}
