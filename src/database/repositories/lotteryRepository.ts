import { DAY_MS, HOUR_MS, WEEK_MS } from "@config/constants";
import { Lottery, type LotteryDraw, type LotteryFrequency, type LotteryRecord } from "@database/models/lottery.schema";

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
	const open = { guildId, isActive: true, isFrozen: false };
	const stack = (): Promise<LotteryRecord | null> =>
		Lottery.findOneAndUpdate(
			{ ...open, "entries.userId": entry.userId },
			{ $inc: { "entries.$.tickets": entry.tickets, prizePool: feePaid } },
			{ new: true, lean: true },
		)
			.lean<LotteryRecord>()
			.exec();

	const stacked = await stack();
	if (stacked) return stacked;

	// Pushed only while the person has no entry, so two first entries at once cannot make two rows for them.
	const pushed = await Lottery.findOneAndUpdate(
		{ ...open, "entries.userId": { $ne: entry.userId } },
		{
			$push: { entries: { ...entry, enteredAt: new Date() } },
			$inc: { prizePool: feePaid },
		},
		{ new: true, lean: true },
	)
		.lean<LotteryRecord>()
		.exec();

	return pushed ?? stack();
}

/** Claims a due draw by moving `nextDrawTime` on only from the time it was read at; the answer carries the new time. */
export async function claimDueDraw(now: Date = new Date()): Promise<LotteryRecord | null> {
	const due = await Lottery.findOne({ isActive: true, isFrozen: false, nextDrawTime: { $lte: now } })
		.lean<LotteryRecord>()
		.exec();
	if (!due) return null;

	const nextDrawTime = new Date(now.getTime() + intervalFor(due.frequency));

	return Lottery.findOneAndUpdate(
		{ guildId: due.guildId, nextDrawTime: due.nextDrawTime },
		{ $set: { nextDrawTime } },
		{ new: true, lean: true },
	)
		.lean<LotteryRecord>()
		.exec();
}

/** Takes away only the tickets and pot that were drawn, so a ticket bought while the draw ran stays for the next one. */
export async function recordDraw(drawn: LotteryRecord, draw: LotteryDraw): Promise<void> {
	const ticketsOf = new Map<string, number>();
	for (const entry of drawn.entries) ticketsOf.set(entry.userId, (ticketsOf.get(entry.userId) ?? 0) + entry.tickets);

	// A lean read applies no default, and a NaN here would be written into the pot for good.
	const base = Number.isFinite(drawn.basePrizePool) ? drawn.basePrizePool : 0;
	const taken: Record<string, number> = { prizePool: base - drawn.prizePool };
	const arrayFilters = [...ticketsOf].map(([userId, tickets], index) => {
		taken[`entries.$[e${String(index)}].tickets`] = -tickets;
		return { [`e${String(index)}.userId`]: userId };
	});

	await Lottery.updateOne(
		{ guildId: drawn.guildId },
		{ $push: { history: { $each: [draw], $slice: -25 } }, $inc: taken },
		arrayFilters.length === 0 ? {} : { arrayFilters },
	).exec();
	await Lottery.updateOne({ guildId: drawn.guildId }, { $pull: { entries: { tickets: { $lte: 0 } } } }).exec();
}
