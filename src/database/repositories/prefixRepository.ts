import { instanceConfig } from "@config/instance";
import { GuildPrefix, type PrefixSettings } from "@database/models/prefix.schema";
import { ReadCache } from "@database/readCache.util";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

interface PrefixConfig {
	prefix: string;
	isEnabled: boolean;
}

/** Prefixes are read on every single message, so they are cached. */
const cache = new ReadCache<PrefixConfig>();

export async function getPrefixConfig(guildId: string): Promise<PrefixConfig> {
	return cache.read(guildId, async () => {
		const record = await GuildPrefix.findOne({ guildId }).lean<PrefixSettings>().exec();

		return {
			prefix: record?.prefix ?? instanceConfig().defaultPrefix,
			// A server that has never touched the setting gets prefix commands on.
			isEnabled: record?.isEnabled ?? true,
		};
	});
}

export async function getPrefix(guildId: string): Promise<string> {
	return (await getPrefixConfig(guildId)).prefix;
}

/** The default is stored as nothing, so a server that is on it moves when the host changes it. */
export async function setPrefix(guildId: string, prefix: string): Promise<string> {
	const update = prefix === instanceConfig().defaultPrefix ? { $unset: { prefix: 1 } } : { $set: { prefix } };
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, update, UPSERT).lean<PrefixSettings>().exec();

	cache.set(guildId, { prefix, isEnabled: record?.isEnabled ?? true });
	return prefix;
}

export async function setPrefixEnabled(guildId: string, isEnabled: boolean): Promise<PrefixConfig> {
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, { $set: { isEnabled } }, UPSERT)
		.lean<PrefixSettings>()
		.exec();

	return cache.set(guildId, { prefix: record?.prefix ?? instanceConfig().defaultPrefix, isEnabled });
}

/** Used by the tests. */
export function clearPrefixCache(): void {
	cache.clear();
}

export async function purgePrefix(guildId: string): Promise<void> {
	await GuildPrefix.deleteMany({ guildId }).exec();
	cache.forget(guildId);
}
