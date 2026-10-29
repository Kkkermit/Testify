import { type Types } from "mongoose";
import {
	StarboardSettingsConfig,
	type StarboardSettingsRecord,
	StarPost,
	type StarPostRecord,
} from "@database/models/starboard.schema";

export type StoredStarboardSettings = Pick<StarboardSettingsRecord, "enabled" | "channelId" | "threshold" | "selfStar">;

export type StoredStarPost = Omit<StarPostRecord, "createdAt" | "updatedAt">;

type Lean = StarPostRecord & { _id: Types.ObjectId };

const SETTINGS_FIELDS = "enabled channelId threshold selfStar";

/** 11000 is Mongo's duplicate key: another reaction claimed the message first. */
function isDuplicateKey(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function toPost(row: Lean): StoredStarPost {
	return {
		guildId: row.guildId,
		messageId: row.messageId,
		channelId: row.channelId,
		authorId: row.authorId,
		boardChannelId: row.boardChannelId ?? null,
		boardMessageId: row.boardMessageId ?? null,
		stars: row.stars,
		removed: row.removed,
	};
}

export async function getStarboardSettings(guildId: string): Promise<StoredStarboardSettings | null> {
	return StarboardSettingsConfig.findOne({ guildId }).select(SETTINGS_FIELDS).lean<StoredStarboardSettings>().exec();
}

export async function saveStarboardSettings(
	guildId: string,
	changes: Partial<StoredStarboardSettings>,
	updatedBy: string | null,
): Promise<StoredStarboardSettings> {
	return StarboardSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select(SETTINGS_FIELDS)
		.lean<StoredStarboardSettings>()
		.exec();
}

export async function findStarPost(guildId: string, messageId: string): Promise<StoredStarPost | null> {
	const row = await StarPost.findOne({ guildId, messageId }).lean<Lean>().exec();
	return row === null ? null : toPost(row);
}

export async function findStarPostByBoardMessage(
	guildId: string,
	boardMessageId: string,
): Promise<StoredStarPost | null> {
	const row = await StarPost.findOne({ guildId, boardMessageId }).lean<Lean>().exec();
	return row === null ? null : toPost(row);
}

/** The unique index decides a race: whoever inserts the record is the one who posts, and everybody else updates. */
export async function claimStarPost(
	fields: Pick<StarPostRecord, "guildId" | "messageId" | "channelId" | "authorId" | "stars">,
): Promise<{ post: StoredStarPost; created: boolean }> {
	try {
		const doc = await StarPost.create({ ...fields, boardChannelId: null, boardMessageId: null, removed: false });
		return { post: toPost(doc.toObject<Lean>()), created: true };
	} catch (error) {
		if (!isDuplicateKey(error)) throw error;
		const existing = await findStarPost(fields.guildId, fields.messageId);
		if (existing === null) throw error;
		return { post: existing, created: false };
	}
}

/** Deletes a claim made before `before` that never posted, so the next claim can take its place; true if it did. */
export async function releaseStaleClaim(guildId: string, messageId: string, before: Date): Promise<boolean> {
	const result = await StarPost.deleteOne({
		guildId,
		messageId,
		boardMessageId: null,
		removed: false,
		createdAt: { $lt: before },
	}).exec();
	return result.deletedCount === 1;
}

export async function recordStars(guildId: string, messageId: string, stars: number): Promise<StoredStarPost | null> {
	const row = await StarPost.findOneAndUpdate({ guildId, messageId }, { $set: { stars } }, { new: true })
		.lean<Lean>()
		.exec();
	return row === null ? null : toPost(row);
}

export async function setBoardMessage(
	guildId: string,
	messageId: string,
	board: { channelId: string; messageId: string },
): Promise<void> {
	await StarPost.updateOne(
		{ guildId, messageId },
		{ $set: { boardChannelId: board.channelId, boardMessageId: board.messageId } },
	).exec();
}

/** Keeps the record, so the message is never reposted after a moderator took it down. */
export async function markStarPostRemoved(guildId: string, messageId: string): Promise<void> {
	await StarPost.updateOne(
		{ guildId, messageId },
		{ $set: { removed: true, boardChannelId: null, boardMessageId: null } },
	).exec();
}

export async function deleteStarPost(guildId: string, messageId: string): Promise<StoredStarPost | null> {
	const row = await StarPost.findOneAndDelete({ guildId, messageId }).lean<Lean>().exec();
	return row === null ? null : toPost(row);
}

export async function countStarPosts(guildId: string): Promise<number> {
	return StarPost.countDocuments({ guildId, removed: false, boardMessageId: { $ne: null } }).exec();
}

export async function purgeStarboard(guildId: string): Promise<void> {
	await Promise.all([StarPost.deleteMany({ guildId }).exec(), StarboardSettingsConfig.deleteMany({ guildId }).exec()]);
}
