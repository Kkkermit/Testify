import {
	ModCaseCounter,
	ModCaseEntry,
	type ModCaseRecord,
	ModCaseSettings,
	type ModCaseSettingsRecord,
} from "@database/models/modCase.schema";

export type StoredCase = Omit<ModCaseRecord, "updatedAt">;

export type CaseFields = Omit<ModCaseRecord, "guildId" | "number" | "createdAt" | "updatedAt">;

const CASE = "guildId number action userId username moderatorId moderatorName reason durationMs createdAt";

/** One `$inc`, so two actions at once can never be given the same number. */
export async function nextCaseNumber(guildId: string): Promise<number> {
	const counter = await ModCaseCounter.findOneAndUpdate(
		{ guildId },
		{ $inc: { last: 1 } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.lean<{ last: number }>()
		.exec();
	return counter.last;
}

export async function createCase(guildId: string, number: number, fields: CaseFields): Promise<StoredCase> {
	const row = await ModCaseEntry.create({ guildId, number, ...fields });
	const { updatedAt: _updatedAt, ...stored } = row.toObject<ModCaseRecord>();
	return stored;
}

export async function findCase(guildId: string, number: number): Promise<StoredCase | null> {
	return ModCaseEntry.findOne({ guildId, number }).select(CASE).lean<StoredCase>().exec();
}

/** Every case in a server, newest first, or one member's. */
export async function listCases(guildId: string, userId?: string): Promise<StoredCase[]> {
	return ModCaseEntry.find(userId === undefined ? { guildId } : { guildId, userId })
		.select(CASE)
		.sort({ number: -1 })
		.lean<StoredCase[]>()
		.exec();
}

export async function getCaseSettings(guildId: string): Promise<Pick<ModCaseSettingsRecord, "logChannelId"> | null> {
	return ModCaseSettings.findOne({ guildId })
		.select("logChannelId")
		.lean<Pick<ModCaseSettingsRecord, "logChannelId">>()
		.exec();
}

export async function saveCaseSettings(
	guildId: string,
	logChannelId: string | null,
	updatedBy: string | null,
): Promise<void> {
	await ModCaseSettings.updateOne({ guildId }, { $set: { logChannelId, updatedBy } }, { upsert: true }).exec();
}

/** The log channel is a setting and goes with the bot; the cases and their numbering are records and stay, like warnings. */
export async function purgeCaseSettings(guildId: string): Promise<void> {
	await ModCaseSettings.deleteMany({ guildId }).exec();
}
