import {
	type BirthdayRecord,
	BirthdaySettingsConfig,
	type BirthdaySettingsRecord,
	SharedBirthday,
} from "@database/models/birthday.schema";

export type StoredBirthdaySettings = Pick<BirthdaySettingsRecord, "enabled" | "channelId" | "message">;

export type StoredBirthday = Pick<BirthdayRecord, "guildId" | "userId" | "username" | "day" | "month">;

const SETTINGS = "enabled channelId message";
const BIRTHDAY = "guildId userId username day month";

export async function getBirthdaySettings(guildId: string): Promise<StoredBirthdaySettings | null> {
	return BirthdaySettingsConfig.findOne({ guildId }).select(SETTINGS).lean<StoredBirthdaySettings>().exec();
}

export async function saveBirthdaySettings(
	guildId: string,
	changes: Partial<StoredBirthdaySettings>,
	updatedBy: string | null,
): Promise<StoredBirthdaySettings> {
	return BirthdaySettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select(SETTINGS)
		.lean<StoredBirthdaySettings>()
		.exec();
}

/** Sharing again moves the date, and leaves the year it was last posted alone so a change cannot post it twice. */
export async function shareBirthday(
	guildId: string,
	userId: string,
	username: string,
	day: number,
	month: number,
): Promise<StoredBirthday> {
	return SharedBirthday.findOneAndUpdate(
		{ guildId, userId },
		{ $set: { username, day, month } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select(BIRTHDAY)
		.lean<StoredBirthday>()
		.exec();
}

export async function findBirthday(guildId: string, userId: string): Promise<StoredBirthday | null> {
	return SharedBirthday.findOne({ guildId, userId }).select(BIRTHDAY).lean<StoredBirthday>().exec();
}

export async function forgetBirthday(guildId: string, userId: string): Promise<boolean> {
	return (await SharedBirthday.deleteOne({ guildId, userId }).exec()).deletedCount > 0;
}

export async function listBirthdays(guildId: string): Promise<StoredBirthday[]> {
	return SharedBirthday.find({ guildId }).select(BIRTHDAY).lean<StoredBirthday[]>().exec();
}

export async function countBirthdays(guildId: string): Promise<number> {
	return SharedBirthday.countDocuments({ guildId }).exec();
}

/** Every server's birthdays on one of these dates not yet posted this year. */
export async function birthdaysDue(
	dates: readonly { day: number; month: number }[],
	year: number,
): Promise<StoredBirthday[]> {
	if (dates.length === 0) return [];
	return SharedBirthday.find({ $or: dates.map(({ day, month }) => ({ day, month })), postedYear: { $ne: year } })
		.select(BIRTHDAY)
		.lean<StoredBirthday[]>()
		.exec();
}

/** True for exactly one caller per member per year, so two runs cannot both post it. */
export async function claimBirthday(guildId: string, userId: string, year: number): Promise<boolean> {
	const { modifiedCount } = await SharedBirthday.updateOne(
		{ guildId, userId, postedYear: { $ne: year } },
		{ $set: { postedYear: year } },
	).exec();
	return modifiedCount > 0;
}

/** Hands a claim back when the post failed for a reason that may pass, so the next run tries again. */
export async function releaseBirthday(guildId: string, userId: string, year: number): Promise<void> {
	await SharedBirthday.updateOne({ guildId, userId, postedYear: year }, { $set: { postedYear: null } }).exec();
}

export async function purgeBirthdays(guildId: string): Promise<void> {
	await Promise.all([
		BirthdaySettingsConfig.deleteMany({ guildId }).exec(),
		SharedBirthday.deleteMany({ guildId }).exec(),
	]);
}
