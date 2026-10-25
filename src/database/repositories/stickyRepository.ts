import { Sticky, type StickyMessage } from "@database/models/sticky.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function listSticky(guildId: string): Promise<StickyMessage[]> {
	return Sticky.find({ guildId }).lean<StickyMessage[]>().exec();
}

export async function setSticky(
	guildId: string,
	channelId: string,
	message: string,
	cap: number,
): Promise<StickyMessage> {
	return Sticky.findOneAndUpdate(
		{ guildId, channelId },
		{ $set: { message, cap }, $setOnInsert: { count: 0, lastMessageId: null } },
		UPSERT,
	).exec() as Promise<StickyMessage>;
}

export async function removeSticky(guildId: string, channelId: string): Promise<boolean> {
	return (await Sticky.deleteOne({ guildId, channelId }).exec()).deletedCount > 0;
}

/** Claims the "time to repost" transition atomically so the sticky cannot double-post. */
export async function bumpSticky(guildId: string, channelId: string): Promise<StickyMessage | null> {
	const record = await Sticky.findOneAndUpdate(
		{ guildId, channelId },
		{ $inc: { count: 1 } },
		{ new: true, lean: true },
	)
		.lean<StickyMessage>()
		.exec();

	if (!record || record.count < record.cap) return null;

	return Sticky.findOneAndUpdate(
		{ guildId, channelId, count: { $gte: record.cap } },
		{ $set: { count: 0 } },
		{ new: true, lean: true },
	)
		.lean<StickyMessage>()
		.exec();
}

export async function setStickyMessageId(guildId: string, channelId: string, messageId: string): Promise<void> {
	await Sticky.updateOne({ guildId, channelId }, { $set: { lastMessageId: messageId } }).exec();
}

export async function purgeSticky(guildId: string): Promise<void> {
	await Sticky.deleteMany({ guildId }).exec();
}
