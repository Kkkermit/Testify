import { CACHE } from "@config/constants";
import { MusicSettingsConfig, type MusicSettingsRecord } from "@database/models/musicSettings.schema";

/** Whether music runs in a server and who may drive it; cached like the prefix, and each write clears its entry. */

/** What a server that has never been configured gets: on, and open to everybody. */
export type StoredMusicSettings = Pick<MusicSettingsRecord, "enabled" | "djRoleIds"> | null;

const cache = new Map<string, { record: StoredMusicSettings; expiresAt: number }>();

function remember(guildId: string, record: StoredMusicSettings): StoredMusicSettings {
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { record, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });

	return record;
}

export function clearMusicSettingsCache(guildId?: string): void {
	if (guildId === undefined) cache.clear();
	else cache.delete(guildId);
}

export async function getMusicSettings(guildId: string): Promise<StoredMusicSettings> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.record;

	const record = await MusicSettingsConfig.findOne({ guildId })
		.select("enabled djRoleIds")
		.lean<Pick<MusicSettingsRecord, "enabled" | "djRoleIds">>()
		.exec();

	return remember(guildId, record ?? null);
}

export async function saveMusicSettings(
	guildId: string,
	changes: Partial<Pick<MusicSettingsRecord, "enabled" | "djRoleIds">>,
	updatedBy: string | null,
): Promise<void> {
	await MusicSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec();

	clearMusicSettingsCache(guildId);
}

export async function purgeMusicSettings(guildId: string): Promise<void> {
	clearMusicSettingsCache(guildId);
	await MusicSettingsConfig.deleteMany({ guildId }).exec();
}
