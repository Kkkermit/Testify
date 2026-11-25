import { randomUUID } from "node:crypto";
import { isDuplicateKey } from "@database/duplicateKey.util";
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

/**
 * Adds a warning and counts the member's warnings given at or after `countsSince` from the write's own answer, so two
 * warnings at once count two different totals and take two different steps.
 */
export async function recordWarning(
	guildId: string,
	userId: string,
	userTag: string,
	executor: { id: string; tag: string },
	reason: string,
	countsSince: Date | null = null,
): Promise<{ entry: WarnEntry; count: number }> {
	const entry: WarnEntry = {
		warnId: randomUUID().slice(0, 8),
		executorId: executor.id,
		executorTag: executor.tag,
		reason,
		timestamp: new Date(),
		edits: [],
	};

	const push = (): Promise<WarnRecord | null> =>
		Warnings.findOneAndUpdate(
			{ guildId, userId },
			{ $push: { warnings: entry }, $set: { userTag }, $setOnInsert: { guildId, userId } },
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		)
			.lean<WarnRecord>()
			.exec();

	let record: WarnRecord | null;
	try {
		record = await push();
	} catch (error) {
		// Two first warnings at once can both try to create the member's record; the one refused finds it made.
		if (!isDuplicateKey(error)) throw error;
		record = await push();
	}

	// The answer is the record straight after this push, so a warning given a moment later is not in it.
	const warnings = record?.warnings ?? [entry];
	const count =
		countsSince === null ? warnings.length : warnings.filter((warning) => warning.timestamp >= countsSince).length;
	return { entry, count };
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

export async function setWarningCase(
	guildId: string,
	userId: string,
	warnId: string,
	caseNumber: number,
): Promise<void> {
	await Warnings.updateOne(
		{ guildId, userId, "warnings.warnId": warnId },
		{ $set: { "warnings.$.caseNumber": caseNumber } },
	).exec();
}

/** Every record in a server; a warning lives inside its member's record, so the list is flattened by the caller. */
export async function listGuildWarnings(guildId: string): Promise<WarnRecord[]> {
	return Warnings.find({ guildId, "warnings.0": { $exists: true } })
		.lean<WarnRecord[]>()
		.exec();
}

/** How many warnings each warned member of a server has. */
export async function warningCounts(guildId: string): Promise<Map<string, number>> {
	const rows = await Warnings.aggregate<{ _id: string; count: number }>([
		{ $match: { guildId, "warnings.0": { $exists: true } } },
		{ $project: { _id: "$userId", count: { $size: "$warnings" } } },
	]).exec();

	return new Map(rows.map((row) => [row._id, row.count]));
}

export async function getWarnLadder(guildId: string): Promise<WarnLadderRecord | null> {
	return WarnLadderConfig.findOne({ guildId }).lean<WarnLadderRecord>().exec();
}

/** Leaving `expireAfterDays` undefined keeps what is stored. */
export async function saveWarnLadder(
	guildId: string,
	steps: WarnLadderRecord["steps"],
	userId: string,
	expireAfterDays?: number | null,
): Promise<WarnLadderRecord> {
	return WarnLadderConfig.findOneAndUpdate(
		{ guildId },
		{
			$set: { steps, lastModifiedBy: userId, ...(expireAfterDays === undefined ? {} : { expireAfterDays }) },
			$setOnInsert: { guildId },
		},
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

/** Hands a claimed softban back with a later expiry, for an unban Discord refused for a reason that may pass. */
export async function retrySoftbanAt(
	softban: Pick<SoftbanEntry, "guildId" | "userId" | "expiresAt">,
	at: Date,
): Promise<void> {
	await Softban.updateOne(
		{ guildId: softban.guildId, userId: softban.userId, isActive: false, expiresAt: softban.expiresAt },
		{ $set: { isActive: true, expiresAt: at } },
	).exec();
}

export async function deactivateSoftban(guildId: string, userId: string): Promise<boolean> {
	const result = await Softban.updateMany({ guildId, userId, isActive: true }, { $set: { isActive: false } }).exec();
	return result.modifiedCount > 0;
}

export async function listActiveSoftbans(guildId: string): Promise<SoftbanEntry[]> {
	return Softban.find({ guildId, isActive: true }).sort({ expiresAt: 1 }).lean<SoftbanEntry[]>().exec();
}
