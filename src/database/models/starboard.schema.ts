import { model, Schema } from "mongoose";
import { STARBOARD_LIMITS } from "@testify/shared";

/** Whether a server's starboard is on, where it reposts, and how many ⭐ it takes. */
export interface StarboardSettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	threshold: number;
	selfStar: boolean;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const starboardSettingsSchema = new Schema<StarboardSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		channelId: { type: String, default: null },
		threshold: { type: Number, required: true, default: STARBOARD_LIMITS.defaultThreshold },
		selfStar: { type: Boolean, required: true, default: false },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const StarboardSettingsConfig = model<StarboardSettingsRecord>("starboardsettings", starboardSettingsSchema);

/** A message that reached the board: where it came from, and the repost that stands for it. */
export interface StarPostRecord {
	guildId: string;
	messageId: string;
	channelId: string;
	authorId: string;
	/** Where the repost went, which stays right after the board moves to another channel. */
	boardChannelId: string | null;
	/** Null until the repost is sent, and again once a moderator has taken it down. */
	boardMessageId: string | null;
	stars: number;
	/** A repost a moderator deleted from the board stays off it, however many ⭐ follow. */
	removed: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const starPostSchema = new Schema<StarPostRecord>(
	{
		guildId: { type: String, required: true },
		messageId: { type: String, required: true },
		channelId: { type: String, required: true },
		authorId: { type: String, required: true },
		boardChannelId: { type: String, default: null },
		boardMessageId: { type: String, default: null },
		stars: { type: Number, required: true, default: 0 },
		removed: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true },
);

starPostSchema.index({ guildId: 1, messageId: 1 }, { unique: true });
starPostSchema.index({ guildId: 1, boardMessageId: 1 });

export const StarPost = model<StarPostRecord>("starposts", starPostSchema);
