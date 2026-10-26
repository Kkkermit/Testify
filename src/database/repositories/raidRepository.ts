import { CACHE } from "@config/constants";
import { RaidSettingsConfig, type RaidSettingsRecord } from "@database/models/raid.schema";

export type StoredRaidSettings = Pick<
	RaidSettingsRecord,
	"enabled" | "alertChannelId" | "pingRoleId" | "minAccountAgeDays" | "spikeJoins" | "spikeMinutes"
>;

const FIELDS = "enabled alertChannelId pingRoleId minAccountAgeDays spikeJoins spikeMinutes";

/** Asked on every join, and a raid is when joins come fastest, so the answer is cached and replaced on every write. */
const cache = new Map<string, { settings: StoredRaidSettings | null; expiresAt: number }>();

export async function getRaidSettings(guildId: string): Promise<StoredRaidSettings | null> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.settings;

	const settings = await RaidSettingsConfig.findOne({ guildId }).select(FIELDS).lean<StoredRaidSettings>().exec();
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { settings, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return settings;
}

export async function saveRaidSettings(
	guildId: string,
	changes: Partial<StoredRaidSettings>,
	updatedBy: string | null,
): Promise<StoredRaidSettings> {
	try {
		return await RaidSettingsConfig.findOneAndUpdate(
			{ guildId },
			{ $set: { ...changes, updatedBy } },
			{ upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
		)
			.select(FIELDS)
			.lean<StoredRaidSettings>()
			.exec();
	} finally {
		cache.delete(guildId);
	}
}

export async function purgeRaidSettings(guildId: string): Promise<void> {
	await RaidSettingsConfig.deleteMany({ guildId }).exec();
	cache.delete(guildId);
}

export function clearRaidCache(): void {
	cache.clear();
}
