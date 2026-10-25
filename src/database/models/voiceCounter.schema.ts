import { model, Schema } from "mongoose";

export interface VoiceCounterSettings {
	guildId: string;
	memberChannelId: string | null;
	botChannelId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const voiceCounterSchema = new Schema<VoiceCounterSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		memberChannelId: { type: String, default: null },
		botChannelId: { type: String, default: null },
	},
	{ timestamps: true },
);

export const VoiceCounter = model<VoiceCounterSettings>("voiceChannelSchema", voiceCounterSchema);
