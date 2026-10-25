import { TreasureConfig, type TreasureConfigSettings } from "@database/models/treasure.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getTreasureConfig(guildId: string): Promise<TreasureConfigSettings | null> {
	return TreasureConfig.findOne({ guildId }).lean<TreasureConfigSettings>().exec();
}

export async function saveTreasureConfig(
	guildId: string,
	fields: Partial<Omit<TreasureConfigSettings, "guildId" | "createdAt" | "updatedAt">> & { lastModifiedBy: string },
): Promise<TreasureConfigSettings> {
	return TreasureConfig.findOneAndUpdate(
		{ guildId },
		{ $set: fields, $setOnInsert: { guildId, createdBy: fields.lastModifiedBy } },
		UPSERT,
	).exec() as Promise<TreasureConfigSettings>;
}

export async function purgeTreasure(guildId: string): Promise<void> {
	await TreasureConfig.deleteMany({ guildId }).exec();
}
