import { AntiLink, type AntiLinkSettings } from "@database/models/antiLink.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getAntiLink(guildId: string): Promise<AntiLinkSettings | null> {
	return AntiLink.findOne({ guildId }).lean<AntiLinkSettings>().exec();
}

export async function setAntiLink(guildId: string, bypassPermission: string): Promise<AntiLinkSettings> {
	return AntiLink.findOneAndUpdate(
		{ guildId },
		{ $set: { bypassPermission } },
		UPSERT,
	).exec() as Promise<AntiLinkSettings>;
}

export async function disableAntiLink(guildId: string): Promise<boolean> {
	return (await AntiLink.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function purgeAntiLink(guildId: string): Promise<void> {
	await AntiLink.deleteMany({ guildId }).exec();
}
