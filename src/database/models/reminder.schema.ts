import { model, Schema } from "mongoose";

/** Where a reminder is delivered: a ping in the channel it was set in, or a direct message. */
export type ReminderDelivery = "channel" | "dm";

/** Something a person asked to be reminded of; it belongs to them, wherever it was set. */
export interface ReminderRecord {
	userId: string;
	/** Null when it was set in a direct message. */
	guildId: string | null;
	channelId: string | null;
	text: string;
	dueAt: Date;
	deliver: ReminderDelivery;
	/** Set while a delivery is under way, so a crash mid-send delivers it again rather than losing it. */
	claimedUntil: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const reminderSchema = new Schema<ReminderRecord>(
	{
		userId: { type: String, required: true },
		guildId: { type: String, default: null },
		channelId: { type: String, default: null },
		text: { type: String, required: true },
		dueAt: { type: Date, required: true },
		deliver: { type: String, enum: ["channel", "dm"], required: true, default: "channel" },
		claimedUntil: { type: Date, default: null },
	},
	{ timestamps: true },
);

reminderSchema.index({ dueAt: 1 });
reminderSchema.index({ userId: 1, dueAt: 1 });

export const Reminder = model<ReminderRecord>("reminders", reminderSchema);
