import { Welcome, type WelcomeSettings } from "@database/models/welcome.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getWelcome(guildId: string): Promise<WelcomeSettings | null> {
	return Welcome.findOne({ guildId }).lean<WelcomeSettings>().exec();
}

/** Partial update, so the panel can change one setting without resending the rest. */
export async function saveWelcome(
	guildId: string,
	patch: Partial<Pick<WelcomeSettings, "channelId" | "message" | "style" | "background">>,
): Promise<WelcomeSettings> {
	return Welcome.findOneAndUpdate({ guildId }, { $set: patch }, UPSERT).exec() as Promise<WelcomeSettings>;
}

export async function disableWelcome(guildId: string): Promise<boolean> {
	return (await Welcome.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function purgeWelcome(guildId: string): Promise<void> {
	await Welcome.deleteMany({ guildId }).exec();
}
