import { GoodbyeSettingsConfig, type GoodbyeSettingsRecord } from "@database/models/goodbye.schema";

export type StoredGoodbyeSettings = Pick<GoodbyeSettingsRecord, "enabled" | "channelId" | "message" | "style">;

const FIELDS = "enabled channelId message style";

export async function getGoodbyeSettings(guildId: string): Promise<StoredGoodbyeSettings | null> {
	return GoodbyeSettingsConfig.findOne({ guildId }).select(FIELDS).lean<StoredGoodbyeSettings>().exec();
}

export async function saveGoodbyeSettings(
	guildId: string,
	changes: Partial<StoredGoodbyeSettings>,
	updatedBy: string | null,
): Promise<StoredGoodbyeSettings> {
	return GoodbyeSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select(FIELDS)
		.lean<StoredGoodbyeSettings>()
		.exec();
}

export async function purgeGoodbye(guildId: string): Promise<void> {
	await GoodbyeSettingsConfig.deleteMany({ guildId }).exec();
}
