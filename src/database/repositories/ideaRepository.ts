import { isValidObjectId, type Types } from "mongoose";
import { Idea, type IdeaRecord, IdeaSettingsConfig, type IdeaSettingsRecord } from "@database/models/idea.schema";
import { type IdeaFilter, type IdeaStatus } from "@testify/shared";

export type StoredIdeaSettings = Pick<IdeaSettingsRecord, "enabled" | "channelId">;

export type StoredIdea = Omit<IdeaRecord, "updatedAt"> & { id: string };

type Lean = IdeaRecord & { _id: Types.ObjectId };

function toIdea(row: Lean): StoredIdea {
	return {
		id: row._id.toString(),
		guildId: row.guildId,
		number: row.number,
		channelId: row.channelId,
		messageId: row.messageId ?? null,
		authorId: row.authorId,
		authorName: row.authorName,
		text: row.text,
		status: row.status,
		reason: row.reason,
		decidedBy: row.decidedBy ?? null,
		decidedByName: row.decidedByName ?? null,
		decidedAt: row.decidedAt ?? null,
		upVoters: row.upVoters,
		downVoters: row.downVoters,
		createdAt: row.createdAt,
	};
}

/** Every lookup by id is scoped to the server too, so one server's panel can never reach another's idea. */
function scope(guildId: string, ideaId: string): { guildId: string; _id: string } | null {
	return isValidObjectId(ideaId) ? { guildId, _id: ideaId } : null;
}

export async function getIdeaSettings(guildId: string): Promise<StoredIdeaSettings | null> {
	return IdeaSettingsConfig.findOne({ guildId }).select("enabled channelId").lean<StoredIdeaSettings>().exec();
}

export async function saveIdeaSettings(
	guildId: string,
	changes: Partial<StoredIdeaSettings>,
	updatedBy: string | null,
): Promise<StoredIdeaSettings> {
	const row = await IdeaSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select("enabled channelId")
		.lean<StoredIdeaSettings>()
		.exec();

	return row;
}

/** Each idea's number comes from one atomic counter, so two posted at once can never share one. */
export async function takeIdeaNumber(guildId: string): Promise<number> {
	const row = await IdeaSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $inc: { nextNumber: 1 } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select("nextNumber")
		.lean<{ nextNumber: number }>()
		.exec();

	return row.nextNumber;
}

export async function createIdea(
	fields: Pick<IdeaRecord, "guildId" | "number" | "channelId" | "authorId" | "authorName" | "text">,
): Promise<StoredIdea> {
	const doc = await Idea.create({ ...fields, status: "open", upVoters: [], downVoters: [] });
	return toIdea(doc.toObject<Lean>());
}

/** When this member last posted an idea here, for the pause between one and the next. */
export async function lastIdeaAt(guildId: string, authorId: string): Promise<Date | null> {
	const row = await Idea.findOne({ guildId, authorId })
		.sort({ createdAt: -1 })
		.select("createdAt")
		.lean<{ createdAt: Date }>()
		.exec();
	return row?.createdAt ?? null;
}

export async function setIdeaMessage(guildId: string, ideaId: string, messageId: string | null): Promise<void> {
	const filter = scope(guildId, ideaId);
	if (filter !== null) await Idea.updateOne(filter, { $set: { messageId } }).exec();
}

export async function findIdea(guildId: string, ideaId: string): Promise<StoredIdea | null> {
	const filter = scope(guildId, ideaId);
	if (filter === null) return null;

	const row = await Idea.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toIdea(row);
}

/** A second press on the same side takes the vote back, and a press on the other side moves it; null once decided. */
export async function voteOnIdea(
	guildId: string,
	ideaId: string,
	userId: string,
	side: "up" | "down",
): Promise<StoredIdea | null> {
	const filter = scope(guildId, ideaId);
	if (filter === null) return null;

	const mine = side === "up" ? "upVoters" : "downVoters";
	const theirs = side === "up" ? "downVoters" : "upVoters";

	const withdrawn = await Idea.findOneAndUpdate(
		{ ...filter, status: "open", [mine]: userId },
		{ $pull: { [mine]: userId } },
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	if (withdrawn !== null) return toIdea(withdrawn);

	const cast = await Idea.findOneAndUpdate(
		{ ...filter, status: "open" },
		{ $addToSet: { [mine]: userId }, $pull: { [theirs]: userId } },
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	return cast === null ? null : toIdea(cast);
}

export async function decideIdea(
	guildId: string,
	ideaId: string,
	decision: { status: IdeaStatus; reason: string; by: string; byName: string; at: Date },
): Promise<StoredIdea | null> {
	const filter = scope(guildId, ideaId);
	if (filter === null) return null;

	const reopened = decision.status === "open";
	const row = await Idea.findOneAndUpdate(
		filter,
		{
			$set: {
				status: decision.status,
				reason: reopened ? "" : decision.reason,
				decidedBy: reopened ? null : decision.by,
				decidedByName: reopened ? null : decision.byName,
				decidedAt: reopened ? null : decision.at,
			},
		},
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	return row === null ? null : toIdea(row);
}

/** Newest first. */
export async function listIdeas(
	guildId: string,
	status: IdeaFilter,
	page: { skip: number; limit: number },
): Promise<{ items: StoredIdea[]; total: number }> {
	const filter = status === "all" ? { guildId } : { guildId, status };
	const [rows, total] = await Promise.all([
		Idea.find(filter).sort({ number: -1 }).skip(page.skip).limit(page.limit).lean<Lean[]>().exec(),
		Idea.countDocuments(filter).exec(),
	]);

	return { items: rows.map(toIdea), total };
}

export async function countIdeas(guildId: string): Promise<Record<IdeaStatus, number>> {
	const rows = await Idea.aggregate<{ _id: IdeaStatus; count: number }>([
		{ $match: { guildId } },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]).exec();

	const counts: Record<IdeaStatus, number> = { open: 0, accepted: 0, declined: 0 };
	for (const row of rows) counts[row._id] = row.count;
	return counts;
}

/** Answers with what was deleted, so the caller can take its post down too. */
export async function deleteIdea(guildId: string, ideaId: string): Promise<StoredIdea | null> {
	const filter = scope(guildId, ideaId);
	if (filter === null) return null;

	const row = await Idea.findOneAndDelete(filter).lean<Lean>().exec();
	return row === null ? null : toIdea(row);
}

export async function purgeIdeas(guildId: string): Promise<void> {
	await Promise.all([Idea.deleteMany({ guildId }).exec(), IdeaSettingsConfig.deleteMany({ guildId }).exec()]);
}
