import { randomUUID } from "node:crypto";
import {
	Softban,
	type SoftbanEntry,
	type WarnEntry,
	Warnings,
	type WarnRecord,
} from "@database/models/moderation.schema";

const LEAN = { lean: true as const, new: true as const };

export async function addWarning(
	guildId: string,
	userId: string,
	userTag: string,
	executor: { id: string; tag: string },
	reason: string,
): Promise<WarnEntry> {
	const entry: WarnEntry = {
		warnId: randomUUID().slice(0, 8),
		executorId: executor.id,
		executorTag: executor.tag,
		reason,
		timestamp: new Date(),
		edits: [],
	};

	await Warnings.updateOne(
		{ guildId, userId },
		{ $push: { warnings: entry }, $set: { userTag }, $setOnInsert: { guildId, userId } },
		{ upsert: true, setDefaultsOnInsert: true },
	).exec();

	return entry;
}

export async function getWarnings(guildId: string, userId: string): Promise<WarnRecord | null> {
	return Warnings.findOne({ guildId, userId }).lean<WarnRecord>().exec();
}

export async function removeWarning(guildId: string, userId: string, warnId: string): Promise<boolean> {
	const result = await Warnings.updateOne({ guildId, userId }, { $pull: { warnings: { warnId } } }).exec();
	return result.modifiedCount > 0;
}

export async function clearWarnings(guildId: string, userId: string): Promise<boolean> {
	const result = await Warnings.deleteOne({ guildId, userId }).exec();
	return result.deletedCount > 0;
}

export async function editWarning(
	guildId: string,
	userId: string,
	warnId: string,
	newReason: string,
	editor: { id: string; tag: string },
): Promise<boolean> {
	const record = await getWarnings(guildId, userId);
	const existing = record?.warnings.find((warning) => warning.warnId === warnId);
	if (!existing) return false;

	const result = await Warnings.updateOne(
		{ guildId, userId, "warnings.warnId": warnId },
		{
			$set: { "warnings.$.reason": newReason },
			$push: {
				"warnings.$.edits": {
					editedById: editor.id,
					editedByTag: editor.tag,
					oldReason: existing.reason,
					newReason,
					editedAt: new Date(),
				},
			},
		},
	).exec();

	return result.modifiedCount > 0;
}

export async function createSoftban(entry: {
	guildId: string;
	userId: string;
	moderatorId: string;
	reason: string;
	expiresAt: Date;
	deleteMessageSeconds?: number;
}): Promise<SoftbanEntry> {
	await Softban.updateMany(
		{ guildId: entry.guildId, userId: entry.userId, isActive: true },
		{ $set: { isActive: false } },
	).exec();

	return Softban.create({
		...entry,
		deleteMessageSeconds: entry.deleteMessageSeconds ?? 0,
		isActive: true,
	}).then((doc) => doc.toObject<SoftbanEntry>());
}

export async function getActiveSoftban(guildId: string, userId: string): Promise<SoftbanEntry | null> {
	return Softban.findOne({ guildId, userId, isActive: true }).lean<SoftbanEntry>().exec();
}

/** Claims one expired softban atomically, so two ticks cannot unban the same user twice. */
export async function claimExpiredSoftban(now: Date = new Date()): Promise<SoftbanEntry | null> {
	return Softban.findOneAndUpdate({ isActive: true, expiresAt: { $lte: now } }, { $set: { isActive: false } }, LEAN)
		.lean<SoftbanEntry>()
		.exec();
}

export async function deactivateSoftban(guildId: string, userId: string): Promise<boolean> {
	const result = await Softban.updateMany({ guildId, userId, isActive: true }, { $set: { isActive: false } }).exec();
	return result.modifiedCount > 0;
}

export async function listActiveSoftbans(guildId: string): Promise<SoftbanEntry[]> {
	return Softban.find({ guildId, isActive: true }).sort({ expiresAt: 1 }).lean<SoftbanEntry[]>().exec();
}
