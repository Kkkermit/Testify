import { isValidObjectId, type Types } from "mongoose";
import { CACHE } from "@config/constants";
import {
	ModmailSettingsConfig,
	type ModmailSettingsRecord,
	ModmailThread,
	type ModmailThreadRecord,
} from "@database/models/modmail.schema";
import { MODMAIL_LIMITS } from "@testify/shared";

export type StoredModmailSettings = Pick<ModmailSettingsRecord, "enabled" | "channelId" | "pingRoleId" | "anonymous">;

export type StoredConversation = Omit<ModmailThreadRecord, "updatedAt" | "expiresAt"> & { id: string };

type Lean = ModmailThreadRecord & { _id: Types.ObjectId };

const SETTINGS = "enabled channelId pingRoleId anonymous";

/** Read on every message in a thread, so the answer is cached and replaced on every write. */
const cache = new Map<string, { settings: StoredModmailSettings | null; expiresAt: number }>();

function toConversation(row: Lean): StoredConversation {
	return {
		id: row._id.toString(),
		guildId: row.guildId,
		userId: row.userId,
		username: row.username,
		threadId: row.threadId ?? null,
		status: row.status,
		waiting: row.waiting,
		lastMessageAt: row.lastMessageAt,
		closedAt: row.closedAt ?? null,
		closedBy: row.closedBy ?? null,
		createdAt: row.createdAt,
	};
}

/** Every lookup by id is scoped to the server too, so one server's staff can never reach another's conversation. */
function scope(guildId: string, conversationId: string): { guildId: string; _id: string } | null {
	return isValidObjectId(conversationId) ? { guildId, _id: conversationId } : null;
}

export async function getModmailSettings(guildId: string): Promise<StoredModmailSettings | null> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.settings;

	const settings = await ModmailSettingsConfig.findOne({ guildId })
		.select(SETTINGS)
		.lean<StoredModmailSettings>()
		.exec();
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { settings, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return settings;
}

export async function saveModmailSettings(
	guildId: string,
	changes: Partial<StoredModmailSettings>,
	updatedBy: string | null,
): Promise<void> {
	try {
		await ModmailSettingsConfig.updateOne(
			{ guildId },
			{ $set: { ...changes, updatedBy } },
			{ upsert: true, setDefaultsOnInsert: true },
		).exec();
	} finally {
		cache.delete(guildId);
	}
}

/** The servers that take mod mail at all, which is the only place a member's servers are looked for. */
export async function modmailGuildIds(): Promise<string[]> {
	const rows = await ModmailSettingsConfig.find({ enabled: true, channelId: { $ne: null } })
		.select("guildId")
		.lean<{ guildId: string }[]>()
		.exec();
	return rows.map((row) => row.guildId);
}

/** Null when this person already has a conversation open anywhere, which the unique index decides. */
export async function claimConversation(
	fields: Pick<ModmailThreadRecord, "guildId" | "userId" | "username">,
): Promise<StoredConversation | null> {
	try {
		const doc = await ModmailThread.create({ ...fields, status: "open", waiting: true, lastMessageAt: new Date() });
		return toConversation(doc.toObject<Lean>());
	} catch (error) {
		if ((error as { code?: number }).code === 11_000) return null;
		throw error;
	}
}

export async function setConversationThread(guildId: string, conversationId: string, threadId: string): Promise<void> {
	const filter = scope(guildId, conversationId);
	if (filter !== null) await ModmailThread.updateOne(filter, { $set: { threadId } }).exec();
}

/** Takes back a claim whose thread could not be made. */
export async function dropConversation(guildId: string, conversationId: string): Promise<void> {
	const filter = scope(guildId, conversationId);
	if (filter !== null) await ModmailThread.deleteOne(filter).exec();
}

export async function openConversationOf(userId: string): Promise<StoredConversation | null> {
	const row = await ModmailThread.findOne({ userId, status: "open" }).lean<Lean>().exec();
	return row === null ? null : toConversation(row);
}

export async function conversationByThread(threadId: string): Promise<StoredConversation | null> {
	const row = await ModmailThread.findOne({ threadId, status: "open" }).lean<Lean>().exec();
	return row === null ? null : toConversation(row);
}

export async function findConversation(guildId: string, conversationId: string): Promise<StoredConversation | null> {
	const filter = scope(guildId, conversationId);
	if (filter === null) return null;

	const row = await ModmailThread.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toConversation(row);
}

/** Who wrote last decides whether a reply is owed. */
export async function noteMessage(conversationId: string, fromMember: boolean): Promise<void> {
	if (!isValidObjectId(conversationId)) return;

	await ModmailThread.updateOne(
		{ _id: conversationId, status: "open" },
		{ $set: { waiting: fromMember, lastMessageAt: new Date() } },
	).exec();
}

/** Only an open conversation can be closed, so staff and the member closing at once cannot both report it. */
export async function closeConversation(
	guildId: string,
	conversationId: string,
	closedBy: string | null,
	at: Date = new Date(),
): Promise<StoredConversation | null> {
	const filter = scope(guildId, conversationId);
	if (filter === null) return null;

	const row = await ModmailThread.findOneAndUpdate(
		{ ...filter, status: "open" },
		{
			$set: {
				status: "closed",
				waiting: false,
				closedAt: at,
				closedBy,
				expiresAt: new Date(at.getTime() + MODMAIL_LIMITS.keepDays * 86_400_000),
			},
		},
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	return row === null ? null : toConversation(row);
}

/** Those still waiting on a reply first, then the most recently active. */
export async function listOpenConversations(guildId: string, limit: number): Promise<StoredConversation[]> {
	const rows = await ModmailThread.find({ guildId, status: "open", threadId: { $ne: null } })
		.sort({ waiting: -1, lastMessageAt: -1 })
		.limit(limit)
		.lean<Lean[]>()
		.exec();
	return rows.map(toConversation);
}

export async function countOpenConversations(guildId: string): Promise<number> {
	return ModmailThread.countDocuments({ guildId, status: "open" }).exec();
}

export async function purgeModmail(guildId: string): Promise<void> {
	await Promise.all([
		ModmailThread.deleteMany({ guildId }).exec(),
		ModmailSettingsConfig.deleteMany({ guildId }).exec(),
	]);
	cache.delete(guildId);
}

export function clearModmailCache(): void {
	cache.clear();
}
