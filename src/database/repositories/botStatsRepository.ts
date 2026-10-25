import { FixedStats, type FixedStatsMessage } from "@database/models/botStats.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getFixedStats(guildId: string): Promise<FixedStatsMessage | null> {
	return FixedStats.findOne({ guildId }).lean<FixedStatsMessage>().exec();
}

export async function listFixedStats(): Promise<FixedStatsMessage[]> {
	return FixedStats.find().lean<FixedStatsMessage[]>().exec();
}

export async function setFixedStats(
	guildId: string,
	channelId: string,
	messageId: string,
	userId: string,
): Promise<FixedStatsMessage> {
	return FixedStats.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, messageId, userId } },
		UPSERT,
	).exec() as Promise<FixedStatsMessage>;
}

export async function removeFixedStats(guildId: string): Promise<boolean> {
	return (await FixedStats.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function purgeFixedStats(guildId: string): Promise<void> {
	await FixedStats.deleteMany({ guildId }).exec();
}
