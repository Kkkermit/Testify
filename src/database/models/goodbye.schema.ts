import { model, Schema } from "mongoose";
import { DEFAULT_GOODBYE_MESSAGE, GOODBYE_STYLES, type GoodbyeStyle } from "@testify/shared";

/** Whether a server says goodbye when somebody leaves, where, and in what words. */
export interface GoodbyeSettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	message: string;
	style: GoodbyeStyle;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const goodbyeSettingsSchema = new Schema<GoodbyeSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		channelId: { type: String, default: null },
		message: { type: String, required: true, default: DEFAULT_GOODBYE_MESSAGE },
		style: { type: String, enum: GOODBYE_STYLES, required: true, default: "text" },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const GoodbyeSettingsConfig = model<GoodbyeSettingsRecord>("goodbyesettings", goodbyeSettingsSchema);
