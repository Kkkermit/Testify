import { CACHE } from "@config/constants";
import { Blacklist, type BlacklistEntry } from "@database/models/moderation.schema";

/** The blacklist gate runs before every command on both surfaces, so it is cached briefly. */

interface CacheEntry {
	value: BlacklistEntry | null;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function findBlacklistEntry(userId: string): Promise<BlacklistEntry | null> {
	const cached = cache.get(userId);
	if (cached && cached.expiresAt > Date.now()) return cached.value;

	const value = await Blacklist.findOne({ userId }).lean<BlacklistEntry>().exec();
	cache.set(userId, { value, expiresAt: Date.now() + CACHE.blacklistTtlMs });
	return value;
}

export async function addToBlacklist(userId: string, reason: string): Promise<BlacklistEntry> {
	const entry = (await Blacklist.findOneAndUpdate(
		{ userId },
		{ $set: { reason }, $setOnInsert: { userId } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec()) as BlacklistEntry;

	cache.delete(userId);
	return entry;
}

export async function removeFromBlacklist(userId: string): Promise<boolean> {
	const result = await Blacklist.deleteOne({ userId }).exec();
	cache.delete(userId);
	return result.deletedCount > 0;
}

export async function listBlacklist(limit = 100): Promise<BlacklistEntry[]> {
	return Blacklist.find().sort({ createdAt: -1 }).limit(limit).lean<BlacklistEntry[]>().exec();
}

export function clearBlacklistCache(): void {
	cache.clear();
}
