import { CACHE, DEFAULT_PREFIX } from "../../config/constants";
import { GuildPrefix, type PrefixSettings } from "../models/guildSettings";

/**
 * A per-guild cache with a TTL, invalidated on write. This single cache removes
 * most of the up-to-seven uncached queries the previous code fired on every
 * message in every guild.
 */

export interface GuildSettings {
	guildId: string;
	prefix: string;
	isPrefixEnabled: boolean;
}

interface CacheEntry {
	value: GuildSettings;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function fallback(guildId: string): GuildSettings {
	return { guildId, prefix: DEFAULT_PREFIX, isPrefixEnabled: true };
}

function evictIfFull(): void {
	if (cache.size < CACHE.guildSettingsMaxEntries) return;
	// Insertion-ordered, so the oldest tenth goes first.
	const drop = Math.ceil(CACHE.guildSettingsMaxEntries / 10);
	let removed = 0;
	for (const key of cache.keys()) {
		cache.delete(key);
		removed += 1;
		if (removed >= drop) break;
	}
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.value;

	const record = await GuildPrefix.findOne({ guildId }).lean<PrefixSettings>().exec();
	const value: GuildSettings = record
		? { guildId, prefix: record.prefix, isPrefixEnabled: record.isEnabled }
		: fallback(guildId);

	evictIfFull();
	cache.set(guildId, { value, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return value;
}

export async function setPrefix(guildId: string, prefix: string): Promise<GuildSettings> {
	const record = (await GuildPrefix.findOneAndUpdate(
		{ guildId },
		{ $set: { prefix }, $setOnInsert: { guildId, isEnabled: true } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec()) as PrefixSettings;

	invalidateGuildSettings(guildId);
	return { guildId, prefix: record.prefix, isPrefixEnabled: record.isEnabled };
}

export async function setPrefixEnabled(guildId: string, isEnabled: boolean): Promise<GuildSettings> {
	const record = (await GuildPrefix.findOneAndUpdate(
		{ guildId },
		{ $set: { isEnabled }, $setOnInsert: { guildId, prefix: DEFAULT_PREFIX } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec()) as PrefixSettings;

	invalidateGuildSettings(guildId);
	return { guildId, prefix: record.prefix, isPrefixEnabled: record.isEnabled };
}

export async function deleteGuildSettings(guildId: string): Promise<void> {
	await GuildPrefix.deleteOne({ guildId }).exec();
	invalidateGuildSettings(guildId);
}

/** Seeds a default prefix row when the bot joins a guild. */
export async function ensureGuildSettings(guildId: string): Promise<GuildSettings> {
	const record = (await GuildPrefix.findOneAndUpdate(
		{ guildId },
		{ $setOnInsert: { guildId, prefix: DEFAULT_PREFIX, isEnabled: true } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec()) as PrefixSettings;

	invalidateGuildSettings(guildId);
	return { guildId, prefix: record.prefix, isPrefixEnabled: record.isEnabled };
}

export function invalidateGuildSettings(guildId: string): void {
	cache.delete(guildId);
}

export function clearGuildSettingsCache(): void {
	cache.clear();
}

export function guildSettingsCacheSize(): number {
	return cache.size;
}
