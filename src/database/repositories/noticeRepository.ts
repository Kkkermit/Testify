import { isValidObjectId, type Types } from "mongoose";
import { CACHE, DAY_MS } from "@config/constants";
import { BotNotice, NoticeReader, type NoticeReaderRecord, type NoticeRecord } from "@database/models/notice.schema";
import { type Notice, NOTICE_LIMITS, type NoticeInput, type NoticePatch } from "@testify/shared";

/** Written before notifications could end, a record has no `endsAt` at all. */
type Row = Omit<NoticeRecord, "endsAt"> & { _id: Types.ObjectId; endsAt?: Date | null };

const READER_KEEP_MS = NOTICE_LIMITS.readerDays * DAY_MS;

/** Asked after every command while any exist, so the list is held in memory and replaced on every write. */
let cached: { notices: Notice[]; expiresAt: number } | null = null;

function toNotice(row: Row): Notice {
	return {
		id: row._id.toString(),
		title: row.title,
		body: row.body,
		tone: row.tone,
		publishedAt: row.publishedAt.toISOString(),
		endsAt: row.endsAt?.toISOString() ?? null,
		updatedAt: row.updatedAt.toISOString(),
	};
}

/** The TTL sweeps a minute or so late, so an end that has passed is asked about directly; `null` matches a missing field. */
function notEnded(): Record<string, unknown> {
	return { $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] };
}

/** Every one not yet taken down, including those waiting to go up, newest first; readers are shown only the live ones. */
export async function listNotices(): Promise<Notice[]> {
	if (cached !== null && cached.expiresAt > Date.now()) return cached.notices;

	const rows = await BotNotice.find(notEnded())
		.sort({ publishedAt: -1, _id: -1 })
		.limit(NOTICE_LIMITS.maxActive)
		.lean<Row[]>()
		.exec();
	const notices = rows.map(toNotice);
	cached = { notices, expiresAt: Date.now() + CACHE.guildSettingsTtlMs };
	return notices;
}

export async function findNotice(id: string): Promise<Notice | null> {
	if (!isValidObjectId(id)) return null;
	const row = await BotNotice.findById(id).lean<Row>().exec();
	return row === null ? null : toNotice(row);
}

/** Null once `maxActive` are up, so the panel that shows them all stays inside Discord's limits. */
export async function createNotice(input: NoticeInput, authorId: string): Promise<Notice | null> {
	try {
		if ((await BotNotice.countDocuments(notEnded()).exec()) >= NOTICE_LIMITS.maxActive) return null;
		const { startsAt, endsAt, ...words } = input;
		const row = await BotNotice.create({
			...words,
			authorId,
			publishedAt: startsAt === undefined ? new Date() : new Date(startsAt),
			endsAt: endsAt === undefined || endsAt === null ? null : new Date(endsAt),
		});
		return toNotice(row.toObject<Row>());
	} finally {
		cached = null;
	}
}

export async function updateNotice(id: string, change: NoticePatch): Promise<Notice | null> {
	if (!isValidObjectId(id)) return null;
	const { notifyAgain, startsAt, endsAt, ...fields } = change;
	const set: Record<string, unknown> = Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined),
	);
	if (startsAt !== undefined) set.publishedAt = new Date(startsAt);
	if (endsAt !== undefined) set.endsAt = endsAt === null ? null : new Date(endsAt);
	if (notifyAgain === true) set.publishedAt = new Date();

	try {
		const row = await BotNotice.findByIdAndUpdate(id, { $set: set }, { new: true }).lean<Row>().exec();
		return row === null ? null : toNotice(row);
	} finally {
		cached = null;
	}
}

export async function deleteNotice(id: string): Promise<boolean> {
	if (!isValidObjectId(id)) return false;
	try {
		return (await BotNotice.deleteOne({ _id: id }).exec()).deletedCount > 0;
	} finally {
		cached = null;
	}
}

export interface ReaderState {
	seenAt: Date | null;
	hintedAt: Date | null;
}

export async function readerState(userId: string): Promise<ReaderState> {
	const row = await NoticeReader.findOne({ userId }).lean<NoticeReaderRecord>().exec();
	return { seenAt: row?.seenAt ?? null, hintedAt: row?.hintedAt ?? null };
}

/** Everything published up to now counts as read, and the hint for it as given. */
export async function markNoticesSeen(userId: string, at: Date = new Date()): Promise<void> {
	await NoticeReader.updateOne(
		{ userId },
		{ $max: { seenAt: at, hintedAt: at, expiresAt: new Date(at.getTime() + READER_KEEP_MS) } },
		{ upsert: true },
	).exec();
}

/** `$max` throughout, so a slow write cannot move a time back past a newer one. */
export async function markNoticeHinted(userId: string, at: Date): Promise<void> {
	await NoticeReader.updateOne(
		{ userId },
		{ $max: { hintedAt: at, expiresAt: new Date(Date.now() + READER_KEEP_MS) } },
		{ upsert: true },
	).exec();
}

export function clearNoticeCache(): void {
	cached = null;
}
