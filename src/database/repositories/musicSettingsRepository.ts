import { MusicSettingsConfig, type MusicSettingsRecord } from "@database/models/musicSettings.schema";
import { ReadCache } from "@database/readCache.util";

/** Whether music runs in a server and who may drive it; cached like the prefix, and each write clears its entry. */

/** What a server that has never been configured gets: on, and open to everybody. */
export type StoredMusicSettings = Pick<MusicSettingsRecord, "enabled" | "djRoleIds"> | null;

const cache = new ReadCache<StoredMusicSettings>();

export async function getMusicSettings(guildId: string): Promise<StoredMusicSettings> {
	return cache.read(guildId, () =>
		MusicSettingsConfig.findOne({ guildId })
			.select("enabled djRoleIds")
			.lean<Pick<MusicSettingsRecord, "enabled" | "djRoleIds">>()
			.exec(),
	);
}

export async function saveMusicSettings(
	guildId: string,
	changes: Partial<Pick<MusicSettingsRecord, "enabled" | "djRoleIds">>,
	updatedBy: string | null,
): Promise<void> {
	try {
		await MusicSettingsConfig.findOneAndUpdate(
			{ guildId },
			{ $set: { ...changes, updatedBy } },
			{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
		).exec();
	} finally {
		cache.forget(guildId);
	}
}

export async function purgeMusicSettings(guildId: string): Promise<void> {
	await MusicSettingsConfig.deleteMany({ guildId }).exec();
	cache.forget(guildId);
}
