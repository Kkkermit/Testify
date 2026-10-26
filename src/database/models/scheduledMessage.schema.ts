import { model, Schema } from "mongoose";
import { SCHEDULE_REPEATS, type ScheduleRepeat } from "@testify/shared";

/** A message a server's managers asked the bot to post later, once or on repeat. */
export interface ScheduledMessageRecord {
	guildId: string;
	channelId: string;
	message: string;
	repeat: ScheduleRepeat;
	nextAt: Date;
	/** Set while a post is under way, so a crash mid-send posts it again rather than losing it. */
	claimedUntil: Date | null;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const scheduledMessageSchema = new Schema<ScheduledMessageRecord>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		message: { type: String, required: true },
		repeat: { type: String, enum: SCHEDULE_REPEATS, required: true, default: "once" },
		nextAt: { type: Date, required: true },
		claimedUntil: { type: Date, default: null },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

scheduledMessageSchema.index({ nextAt: 1 });
scheduledMessageSchema.index({ guildId: 1, nextAt: 1 });

export const ScheduledPost = model<ScheduledMessageRecord>("scheduledmessages", scheduledMessageSchema);
