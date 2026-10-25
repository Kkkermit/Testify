import { model, Schema } from "mongoose";

export interface StickyMessage {
	guildId: string;
	channelId: string;
	message: string;
	count: number;
	cap: number;
	lastMessageId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const stickySchema = new Schema<StickyMessage>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		message: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		cap: { type: Number, required: true, default: 5 },
		lastMessageId: { type: String, default: null },
	},
	{ timestamps: true },
);

stickySchema.index({ guildId: 1, channelId: 1 }, { unique: true });

export const Sticky = model<StickyMessage>("stickyschema", stickySchema);
