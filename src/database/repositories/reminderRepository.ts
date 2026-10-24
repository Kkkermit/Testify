import { isValidObjectId, type Types } from "mongoose";
import { Reminder, type ReminderDelivery, type ReminderRecord } from "@database/models/reminder.schema";

export type StoredReminder = Pick<
	ReminderRecord,
	"userId" | "guildId" | "channelId" | "text" | "dueAt" | "deliver" | "createdAt"
> & { id: string };

type Lean = ReminderRecord & { _id: Types.ObjectId };

function toReminder(row: Lean): StoredReminder {
	return {
		id: row._id.toString(),
		userId: row.userId,
		guildId: row.guildId ?? null,
		channelId: row.channelId ?? null,
		text: row.text,
		dueAt: row.dueAt,
		deliver: row.deliver,
		createdAt: row.createdAt,
	};
}

/** Every lookup by id is the owner's too, so nobody can see, change or cancel another person's reminder. */
function owned(userId: string, reminderId: string): { userId: string; _id: string } | null {
	return isValidObjectId(reminderId) ? { userId, _id: reminderId } : null;
}

export async function createReminder(
	fields: Pick<ReminderRecord, "userId" | "guildId" | "channelId" | "text" | "dueAt" | "deliver">,
): Promise<StoredReminder> {
	const doc = await Reminder.create({ ...fields, claimedUntil: null });
	return toReminder(doc.toObject<Lean>());
}

export async function countReminders(userId: string): Promise<number> {
	return Reminder.countDocuments({ userId }).exec();
}

/** Soonest first. */
export async function listReminders(userId: string): Promise<StoredReminder[]> {
	const rows = await Reminder.find({ userId }).sort({ dueAt: 1 }).lean<Lean[]>().exec();
	return rows.map(toReminder);
}

export async function findReminder(userId: string, reminderId: string): Promise<StoredReminder | null> {
	const filter = owned(userId, reminderId);
	if (filter === null) return null;

	const row = await Reminder.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toReminder(row);
}

export async function setReminderDelivery(
	userId: string,
	reminderId: string,
	deliver: ReminderDelivery,
): Promise<StoredReminder | null> {
	const filter = owned(userId, reminderId);
	if (filter === null) return null;

	const row = await Reminder.findOneAndUpdate(filter, { $set: { deliver } }, { new: true }).lean<Lean>().exec();
	return row === null ? null : toReminder(row);
}

export async function cancelReminder(userId: string, reminderId: string): Promise<boolean> {
	const filter = owned(userId, reminderId);
	if (filter === null) return false;

	return (await Reminder.deleteOne(filter).exec()).deletedCount > 0;
}

/** Takes the soonest due reminder nobody is delivering, holding it for `leaseMs` so two runs cannot both send it. */
export async function claimDueReminder(now: Date, leaseMs: number): Promise<StoredReminder | null> {
	const row = await Reminder.findOneAndUpdate(
		{ dueAt: { $lte: now }, $or: [{ claimedUntil: null }, { claimedUntil: { $lte: now } }] },
		{ $set: { claimedUntil: new Date(now.getTime() + leaseMs) } },
		{ new: true, sort: { dueAt: 1 } },
	)
		.lean<Lean>()
		.exec();

	return row === null ? null : toReminder(row);
}

/** Called once a reminder has been sent, or could not be sent anywhere. */
export async function finishReminder(reminderId: string): Promise<void> {
	if (!isValidObjectId(reminderId)) return;
	await Reminder.deleteOne({ _id: reminderId }).exec();
}
