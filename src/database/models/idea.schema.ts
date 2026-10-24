import { model, Schema } from "mongoose";
import { IDEA_STATUSES, type IdeaStatus } from "@testify/shared";

/** Whether a server's idea board is on, where it posts, and the number the next idea takes. */
export interface IdeaSettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	nextNumber: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const ideaSettingsSchema = new Schema<IdeaSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		channelId: { type: String, default: null },
		nextNumber: { type: Number, required: true, default: 0 },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const IdeaSettingsConfig = model<IdeaSettingsRecord>("ideasettings", ideaSettingsSchema);

/** One idea a member posted, the votes on it and what staff decided. */
export interface IdeaRecord {
	guildId: string;
	number: number;
	channelId: string;
	messageId: string | null;
	authorId: string;
	/** Kept because somebody who has left can no longer be looked up. */
	authorName: string;
	text: string;
	status: IdeaStatus;
	reason: string;
	decidedBy: string | null;
	decidedByName: string | null;
	decidedAt: Date | null;
	/** Who voted, which is what stops anybody voting twice and lets a second press take a vote back. */
	upVoters: string[];
	downVoters: string[];
	createdAt: Date;
	updatedAt: Date;
}

const ideaSchema = new Schema<IdeaRecord>(
	{
		guildId: { type: String, required: true },
		number: { type: Number, required: true },
		channelId: { type: String, required: true },
		messageId: { type: String, default: null },
		authorId: { type: String, required: true },
		authorName: { type: String, required: true },
		text: { type: String, required: true },
		status: { type: String, enum: IDEA_STATUSES, required: true, default: "open" },
		reason: { type: String, default: "" },
		decidedBy: { type: String, default: null },
		decidedByName: { type: String, default: null },
		decidedAt: { type: Date, default: null },
		upVoters: { type: [String], required: true, default: [] },
		downVoters: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

ideaSchema.index({ guildId: 1, number: 1 }, { unique: true });
ideaSchema.index({ guildId: 1, status: 1, createdAt: -1 });

export const Idea = model<IdeaRecord>("ideas", ideaSchema);
