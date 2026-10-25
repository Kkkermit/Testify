import { model, Schema } from "mongoose";

export interface FixedStatsMessage {
	guildId: string;
	channelId: string;
	messageId: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

const fixedStatsSchema = new Schema<FixedStatsMessage>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		messageId: { type: String, required: true },
		userId: { type: String, required: true },
	},
	{ timestamps: true },
);

export const FixedStats = model<FixedStatsMessage>("guildChannelSchema", fixedStatsSchema);
