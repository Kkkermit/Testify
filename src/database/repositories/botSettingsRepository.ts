import { CACHE } from "@config/constants";
import { BotSettingsConfig, type BotSettingsRecord } from "@database/models/botSettings.schema";

/** The owner's bot-wide settings; read on every `/play`, so cached like a server's prefix and cleared on each write. */

const SCOPE = "GLOBAL";

export type StoredBotSettings = Pick<BotSettingsRecord, "musicSources"> | null;

let cached: { record: StoredBotSettings; expiresAt: number } | null = null;

export async function getBotSettings(): Promise<StoredBotSettings> {
	if (cached !== null && cached.expiresAt > Date.now()) return cached.record;

	const record = await BotSettingsConfig.findOne({ scope: SCOPE })
		.select("musicSources")
		.lean<Pick<BotSettingsRecord, "musicSources">>()
		.exec();

	cached = { record: record ?? null, expiresAt: Date.now() + CACHE.guildSettingsTtlMs };
	return cached.record;
}

export async function saveBotSettings(
	changes: Partial<Pick<BotSettingsRecord, "musicSources">>,
	updatedBy: string | null,
): Promise<void> {
	await BotSettingsConfig.findOneAndUpdate(
		{ scope: SCOPE },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec();

	cached = null;
}
