import { CACHE } from "@config/constants";
import { RaidSettingsConfig, type RaidSettingsRecord } from "@database/models/raid.schema";

export type StoredRaidSettings = Pick<
	RaidSettingsRecord,
	"enabled" | "alertChannelId" | "pingRoleId" | "minAccountAgeMinutes" | "spikeJoins" | "spikeMinutes"
>;

/** What a record can hold on disk: one written before minutes has days and no minutes. */
export type RaidSettingsOnDisk = Partial<Pick<RaidSettingsRecord, "minAccountAgeMinutes" | "minAccountAgeDays">> &
	Omit<StoredRaidSettings, "minAccountAgeMinutes">;

const FIELDS = "enabled alertChannelId pingRoleId minAccountAgeMinutes minAccountAgeDays spikeJoins spikeMinutes";

/** Asked on every join, and a raid is when joins come fastest, so the answer is cached and replaced on every write. */
const cache = new Map<string, { settings: RaidSettingsOnDisk | null; expiresAt: number }>();

export async function getRaidSettings(guildId: string): Promise<RaidSettingsOnDisk | null> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.settings;

	const settings = await RaidSettingsConfig.findOne({ guildId }).select(FIELDS).lean<RaidSettingsOnDisk>().exec();
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { settings, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return settings;
}

export async function saveRaidSettings(
	guildId: string,
	changes: Partial<StoredRaidSettings>,
	updatedBy: string | null,
): Promise<RaidSettingsOnDisk> {
	// Writing the age in minutes retires the days it was once kept in, so the two can never disagree.
	const retire = changes.minAccountAgeMinutes === undefined ? {} : { $unset: { minAccountAgeDays: "" } };
	try {
		return await RaidSettingsConfig.findOneAndUpdate(
			{ guildId },
			{ $set: { ...changes, updatedBy }, ...retire },
			{ upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
		)
			.select(FIELDS)
			.lean<RaidSettingsOnDisk>()
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
