import { model, Schema } from "mongoose";
import { DEFAULT_BIRTHDAY_MESSAGE } from "@testify/shared";

/** Whether a server posts birthdays, and where. */
export interface BirthdaySettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	message: string;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/** A birthday one member shared with one server. There is no year, so the server never learns an age. */
export interface BirthdayRecord {
	guildId: string;
	userId: string;
	/** The name they had when they shared it, for a list that cannot fetch everybody. */
	username: string;
	day: number;
	month: number;
	/** The year it was last posted, so a run that restarts mid-day cannot post it twice. */
	postedYear: number | null;
	createdAt: Date;
	updatedAt: Date;
}

const settingsSchema = new Schema<BirthdaySettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, default: false },
		channelId: { type: String, default: null },
		message: { type: String, default: DEFAULT_BIRTHDAY_MESSAGE },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

const birthdaySchema = new Schema<BirthdayRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		day: { type: Number, required: true, min: 1, max: 31 },
		month: { type: Number, required: true, min: 1, max: 12 },
		postedYear: { type: Number, default: null },
	},
	{ timestamps: true },
);

birthdaySchema.index({ guildId: 1, userId: 1 }, { unique: true });
birthdaySchema.index({ month: 1, day: 1 });

export const BirthdaySettingsConfig = model<BirthdaySettingsRecord>("birthdaysettings", settingsSchema);
export const SharedBirthday = model<BirthdayRecord>("birthdays", birthdaySchema);
