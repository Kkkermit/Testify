import { CACHE } from "@config/constants";
import { Blacklist, type BlacklistEntry } from "@database/models/moderation.schema";
import { ReadCache } from "@database/readCache.util";

/** The blacklist gate runs before every command on both surfaces, so each answer is cached briefly. */
const cache = new ReadCache<BlacklistEntry | null>(CACHE.blacklistTtlMs);

export async function findBlacklistEntry(userId: string): Promise<BlacklistEntry | null> {
	return cache.read(userId, () => Blacklist.findOne({ userId }).lean<BlacklistEntry>().exec());
}

export async function addToBlacklist(userId: string, reason: string): Promise<BlacklistEntry> {
	try {
		return (await Blacklist.findOneAndUpdate(
			{ userId },
			{ $set: { reason }, $setOnInsert: { userId } },
			{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
		).exec()) as BlacklistEntry;
	} finally {
		cache.forget(userId);
	}
}

export async function removeFromBlacklist(userId: string): Promise<boolean> {
	try {
		return (await Blacklist.deleteOne({ userId }).exec()).deletedCount > 0;
	} finally {
		cache.forget(userId);
	}
}

export async function listBlacklist(limit = 100): Promise<BlacklistEntry[]> {
	return Blacklist.find().sort({ createdAt: -1 }).limit(limit).lean<BlacklistEntry[]>().exec();
}

export function clearBlacklistCache(): void {
	cache.clear();
}
