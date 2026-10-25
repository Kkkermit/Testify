import { isValidObjectId, type Types } from "mongoose";
import { ScheduledPost, type ScheduledMessageRecord } from "@database/models/scheduledMessage.schema";

export type StoredSchedule = Pick<ScheduledMessageRecord, "guildId" | "channelId" | "message" | "repeat" | "nextAt"> & {
	id: string;
};

export type ScheduleFields = Pick<ScheduledMessageRecord, "channelId" | "message" | "repeat" | "nextAt">;

type Lean = ScheduledMessageRecord & { _id: Types.ObjectId };

function toSchedule(row: Lean): StoredSchedule {
	return {
		id: row._id.toString(),
		guildId: row.guildId,
		channelId: row.channelId,
		message: row.message,
		repeat: row.repeat,
		nextAt: row.nextAt,
	};
}

/** Every lookup by id is the server's too, so one server can never see or change another's. */
function inGuild(guildId: string, id: string): { guildId: string; _id: string } | null {
	return isValidObjectId(id) ? { guildId, _id: id } : null;
}

/** Soonest first. */
export async function listSchedules(guildId: string): Promise<StoredSchedule[]> {
	const rows = await ScheduledPost.find({ guildId }).sort({ nextAt: 1, _id: 1 }).lean<Lean[]>().exec();
	return rows.map(toSchedule);
}

export async function countSchedules(guildId: string): Promise<number> {
	return ScheduledPost.countDocuments({ guildId }).exec();
}

export async function findSchedule(guildId: string, id: string): Promise<StoredSchedule | null> {
	const filter = inGuild(guildId, id);
	if (filter === null) return null;
	const row = await ScheduledPost.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toSchedule(row);
}

export async function createSchedule(
	guildId: string,
	fields: ScheduleFields,
	updatedBy: string | null,
): Promise<StoredSchedule> {
	const row = await ScheduledPost.create({ guildId, ...fields, claimedUntil: null, updatedBy });
	return toSchedule(row.toObject<Lean>());
}

/** Releases any claim, so a post rescheduled mid-send is posted at its new time. */
export async function updateSchedule(
	guildId: string,
	id: string,
	fields: Partial<ScheduleFields>,
	updatedBy: string | null,
): Promise<StoredSchedule | null> {
	const filter = inGuild(guildId, id);
	if (filter === null) return null;

	const row = await ScheduledPost.findOneAndUpdate(
		filter,
		{ $set: { ...fields, claimedUntil: null, updatedBy } },
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	return row === null ? null : toSchedule(row);
}

export async function deleteSchedule(guildId: string, id: string): Promise<boolean> {
	const filter = inGuild(guildId, id);
	if (filter === null) return false;
	return (await ScheduledPost.deleteOne(filter).exec()).deletedCount > 0;
}

/** Takes the soonest due post nobody is sending, across every server, holding it for `leaseMs`. */
export async function claimDueSchedule(now: Date, leaseMs: number): Promise<StoredSchedule | null> {
	const row = await ScheduledPost.findOneAndUpdate(
		{ nextAt: { $lte: now }, $or: [{ claimedUntil: null }, { claimedUntil: { $lte: now } }] },
		{ $set: { claimedUntil: new Date(now.getTime() + leaseMs) } },
		{ new: true, sort: { nextAt: 1 } },
	)
		.lean<Lean>()
		.exec();

	return row === null ? null : toSchedule(row);
}

/**
 * Moves a post on to its next time, or deletes a one-off when `nextAt` is null. Matched on the time it was claimed
 * at, so an edit made while it was being sent is kept rather than overwritten.
 */
export async function settleSchedule(claimed: StoredSchedule, nextAt: Date | null): Promise<void> {
	const filter = { _id: claimed.id, nextAt: claimed.nextAt };
	if (nextAt === null) {
		await ScheduledPost.deleteOne(filter).exec();
		return;
	}
	await ScheduledPost.updateOne(filter, { $set: { nextAt, claimedUntil: null } }).exec();
}

export async function purgeSchedules(guildId: string): Promise<void> {
	await ScheduledPost.deleteMany({ guildId }).exec();
}
