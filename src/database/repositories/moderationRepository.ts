import { randomUUID } from "node:crypto";
import {
	Softban,
	type SoftbanEntry,
	type WarnEntry,
	WarnLadderConfig,
	type WarnLadderRecord,
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

/** What the warning's step was and whether it happened, written once the step has been tried. */
export async function setWarningStep(
	guildId: string,
	userId: string,
	warnId: string,
	step: string,
	stepProblem: string | null,
): Promise<void> {
	await Warnings.updateOne(
		{ guildId, userId, "warnings.warnId": warnId },
		{ $set: { "warnings.$.step": step, "warnings.$.stepProblem": stepProblem } },
	).exec();
}

/** Every record in a server; a warning lives inside its member's record, so the list is flattened by the caller. */
export async function listGuildWarnings(guildId: string): Promise<WarnRecord[]> {
	return Warnings.find({ guildId, "warnings.0": { $exists: true } })
		.lean<WarnRecord[]>()
		.exec();
}

export async function countWarnings(guildId: string, userId: string): Promise<number> {
	return (await getWarnings(guildId, userId))?.warnings.length ?? 0;
}

export async function getWarnLadder(guildId: string): Promise<WarnLadderRecord | null> {
	return WarnLadderConfig.findOne({ guildId }).lean<WarnLadderRecord>().exec();
}

export async function saveWarnLadder(
	guildId: string,
	steps: WarnLadderRecord["steps"],
	userId: string,
): Promise<WarnLadderRecord> {
	return WarnLadderConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { steps, lastModifiedBy: userId }, $setOnInsert: { guildId } },
		{ upsert: true, new: true, lean: true },
	).exec() as Promise<WarnLadderRecord>;
}

export async function purgeWarnLadder(guildId: string): Promise<void> {
	await WarnLadderConfig.deleteMany({ guildId }).exec();
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
