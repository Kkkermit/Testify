import { VoiceCounter, type VoiceCounterSettings } from "@database/models/voiceCounter.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getVoiceCounter(guildId: string): Promise<VoiceCounterSettings | null> {
	return VoiceCounter.findOne({ guildId }).lean<VoiceCounterSettings>().exec();
}

export async function setVoiceCounter(
	guildId: string,
	fields: Partial<Pick<VoiceCounterSettings, "memberChannelId" | "botChannelId">>,
): Promise<VoiceCounterSettings> {
	return VoiceCounter.findOneAndUpdate({ guildId }, { $set: fields }, UPSERT).exec() as Promise<VoiceCounterSettings>;
}

export async function purgeVoiceCounter(guildId: string): Promise<void> {
	await VoiceCounter.deleteMany({ guildId }).exec();
}
