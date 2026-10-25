import { CACHE, DEFAULT_PREFIX } from "@config/constants";
import { GuildPrefix, type PrefixSettings } from "@database/models/prefix.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

/** Prefixes are read on every single message, so they are cached. */
export interface PrefixConfig {
	prefix: string;
	isEnabled: boolean;
}

const prefixCache = new Map<string, { config: PrefixConfig; expiresAt: number }>();

function remember(guildId: string, config: PrefixConfig): PrefixConfig {
	if (prefixCache.size > CACHE.guildSettingsMaxEntries) prefixCache.clear();
	prefixCache.set(guildId, { config, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return config;
}

export async function getPrefixConfig(guildId: string): Promise<PrefixConfig> {
	const cached = prefixCache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.config;

	const record = await GuildPrefix.findOne({ guildId }).lean<PrefixSettings>().exec();

	return remember(guildId, {
		prefix: record?.prefix ?? DEFAULT_PREFIX,
		// A server that has never touched the setting gets prefix commands on.
		isEnabled: record?.isEnabled ?? true,
	});
}

export async function getPrefix(guildId: string): Promise<string> {
	return (await getPrefixConfig(guildId)).prefix;
}

export async function setPrefix(guildId: string, prefix: string): Promise<string> {
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, { $set: { prefix } }, UPSERT)
		.lean<PrefixSettings>()
		.exec();

	remember(guildId, { prefix, isEnabled: record?.isEnabled ?? true });
	return prefix;
}

export async function setPrefixEnabled(guildId: string, isEnabled: boolean): Promise<PrefixConfig> {
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, { $set: { isEnabled } }, UPSERT)
		.lean<PrefixSettings>()
		.exec();

	return remember(guildId, { prefix: record?.prefix ?? DEFAULT_PREFIX, isEnabled });
}

/** Used by the tests, and after a prefix is changed elsewhere. */
export function clearPrefixCache(): void {
	prefixCache.clear();
}

export async function purgePrefix(guildId: string): Promise<void> {
	prefixCache.delete(guildId);
	await GuildPrefix.deleteMany({ guildId }).exec();
}
