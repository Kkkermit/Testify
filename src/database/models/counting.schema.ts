import { model, Schema } from "mongoose";
import { COUNTING_DEFAULT_MAX } from "@config/constants";

export interface CountingSettings {
	guildId: string;
	channelId: string;
	count: number;
	maxCount: number;
	lastUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const countingSchema = new Schema<CountingSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		maxCount: { type: Number, required: true, default: COUNTING_DEFAULT_MAX },
		lastUserId: { type: String, default: null },
	},
	{ timestamps: true },
);

export const Counting = model<CountingSettings>("countingSchema", countingSchema);
