import { model, Schema } from "mongoose";
import { NOTICE_TONES, type NoticeTone } from "@testify/shared";

/** A note from the bot's owners to everybody who uses it; bot-wide, so no server is named. */
export interface NoticeRecord {
	title: string;
	body: string;
	tone: NoticeTone;
	/** In the future while it waits to go up. */
	publishedAt: Date;
	endsAt: Date | null;
	authorId: string;
	createdAt: Date;
	updatedAt: Date;
}

const noticeSchema = new Schema<NoticeRecord>(
	{
		title: { type: String, required: true },
		body: { type: String, required: true },
		tone: { type: String, enum: NOTICE_TONES, required: true, default: "info" },
		publishedAt: { type: Date, required: true },
		endsAt: { type: Date, default: null },
		authorId: { type: String, required: true },
	},
	{ timestamps: true },
);

noticeSchema.index({ publishedAt: -1 });
// A null end is not a date, so the TTL leaves a notification with no end alone.
noticeSchema.index({ endsAt: 1 }, { expireAfterSeconds: 0 });

export const BotNotice = model<NoticeRecord>("botnotices", noticeSchema);

/** When one person last read the notifications and was last told of a new one, and nothing else about them. */
export interface NoticeReaderRecord {
	userId: string;
	seenAt: Date | null;
	hintedAt: Date | null;
	/** Pushed forward on every touch, so somebody who stops using the bot is forgotten. */
	expiresAt: Date;
}

const noticeReaderSchema = new Schema<NoticeReaderRecord>({
	userId: { type: String, required: true },
	seenAt: { type: Date, default: null },
	hintedAt: { type: Date, default: null },
	expiresAt: { type: Date, required: true },
});

noticeReaderSchema.index({ userId: 1 }, { unique: true });
noticeReaderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const NoticeReader = model<NoticeReaderRecord>("noticereaders", noticeReaderSchema);
