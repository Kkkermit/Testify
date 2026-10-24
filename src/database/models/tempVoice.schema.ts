import { model, Schema } from "mongoose";
import { TEMP_VOICE_LIMITS } from "@testify/shared";

/** Which voice channel is a server's lobby, and how the channels it makes are set up. */
export interface TempVoiceSettingsRecord {
	guildId: string;
	enabled: boolean;
	lobbyChannelId: string | null;
	categoryId: string | null;
	nameTemplate: string;
	userLimit: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const tempVoiceSettingsSchema = new Schema<TempVoiceSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		lobbyChannelId: { type: String, default: null },
		categoryId: { type: String, default: null },
		nameTemplate: { type: String, required: true, default: TEMP_VOICE_LIMITS.defaultTemplate },
		userLimit: { type: Number, required: true, default: 0 },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const TempVoiceSettingsConfig = model<TempVoiceSettingsRecord>("tempvoicesettings", tempVoiceSettingsSchema);

/** A channel the bot made for somebody, kept so it can be found and deleted once it empties, even after a restart. */
export interface TempChannelRecord {
	guildId: string;
	channelId: string;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
}

const tempChannelSchema = new Schema<TempChannelRecord>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true, unique: true },
		ownerId: { type: String, required: true },
	},
	{ timestamps: true },
);

tempChannelSchema.index({ guildId: 1, ownerId: 1 });

export const TempChannel = model<TempChannelRecord>("tempvoicechannels", tempChannelSchema);
