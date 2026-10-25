import { Counting, type CountingSettings } from "@database/models/counting.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getCounting(guildId: string): Promise<CountingSettings | null> {
	return Counting.findOne({ guildId }).lean<CountingSettings>().exec();
}

export async function setCounting(guildId: string, channelId: string, maxCount: number): Promise<CountingSettings> {
	return Counting.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, maxCount }, $setOnInsert: { count: 0, lastUserId: null } },
		UPSERT,
	).exec() as Promise<CountingSettings>;
}

export async function disableCounting(guildId: string): Promise<boolean> {
	return (await Counting.deleteOne({ guildId }).exec()).deletedCount > 0;
}

/**
 * The expected count and the not-the-same-user rule are in the filter, so two concurrent messages cannot double-count.
 */
export async function advanceCount(
	guildId: string,
	expected: number,
	userId: string,
): Promise<CountingSettings | null> {
	return Counting.findOneAndUpdate(
		{ guildId, count: expected - 1, lastUserId: { $ne: userId } },
		{ $set: { count: expected, lastUserId: userId } },
		{ new: true, lean: true },
	)
		.lean<CountingSettings>()
		.exec();
}

export async function resetCount(guildId: string): Promise<void> {
	await Counting.updateOne({ guildId }, { $set: { count: 0, lastUserId: null } }).exec();
}

export async function purgeCounting(guildId: string): Promise<void> {
	await Counting.deleteMany({ guildId }).exec();
}
