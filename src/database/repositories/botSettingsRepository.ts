import { BotSettingsConfig, type BotSettingsRecord } from "@database/models/botSettings.schema";
import { ReadCache } from "@database/readCache.util";

/** The owner's bot-wide settings; read on every `/play`, so cached like a server's prefix and cleared on each write. */

const SCOPE = "GLOBAL";

export type StoredBotSettings = Pick<BotSettingsRecord, "musicSources"> | null;

const cache = new ReadCache<StoredBotSettings>();

export async function getBotSettings(): Promise<StoredBotSettings> {
	return cache.read(SCOPE, () =>
		BotSettingsConfig.findOne({ scope: SCOPE })
			.select("musicSources")
			.lean<Pick<BotSettingsRecord, "musicSources">>()
			.exec(),
	);
}

export async function saveBotSettings(
	changes: Partial<Pick<BotSettingsRecord, "musicSources">>,
	updatedBy: string | null,
): Promise<void> {
	try {
		await BotSettingsConfig.findOneAndUpdate(
			{ scope: SCOPE },
			{ $set: { ...changes, updatedBy } },
			{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
		).exec();
	} finally {
		cache.forget(SCOPE);
	}
}
