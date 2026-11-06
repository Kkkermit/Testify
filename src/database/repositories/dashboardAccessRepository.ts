import { MINUTE_MS } from "@config/constants";
import { DashboardAccess, type DashboardAccessRecord } from "@database/models/dashboardAccess.schema";
import { type AccessArea } from "@testify/shared";

export type StoredAccess = DashboardAccessRecord;

const FIELDS = "guildId userId username areas addedBy addedByName lastSeenAt createdAt updatedAt";

/** How stale "last seen" may be, so a person clicking through the screens costs a write every ten minutes at most. */
const SEEN_EVERY_MS = 10 * MINUTE_MS;

/** 11000 is Mongo's duplicate key: the person already has access here. */
function isDuplicateKey(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function findAccess(guildId: string, userId: string): Promise<StoredAccess | null> {
	return DashboardAccess.findOne({ guildId, userId }).select(FIELDS).lean<StoredAccess>().exec();
}

/** Every server this person was given part of, which the server list reads once per sign-in refresh. */
export async function accessFor(userId: string): Promise<Pick<StoredAccess, "guildId" | "areas">[]> {
	return DashboardAccess.find({ userId })
		.select("guildId areas")
		.lean<Pick<StoredAccess, "guildId" | "areas">[]>()
		.exec();
}

export async function listAccess(guildId: string): Promise<StoredAccess[]> {
	return DashboardAccess.find({ guildId }).sort({ createdAt: 1 }).select(FIELDS).lean<StoredAccess[]>().exec();
}

export async function countAccess(guildId: string): Promise<number> {
	return DashboardAccess.countDocuments({ guildId }).exec();
}

/** The unique index decides a race, so two admins adding the same person at once store one record. */
export async function addAccess(
	fields: Pick<DashboardAccessRecord, "guildId" | "userId" | "username" | "areas" | "addedBy" | "addedByName">,
): Promise<StoredAccess | null> {
	try {
		const doc = await DashboardAccess.create({ ...fields, lastSeenAt: null });
		return doc.toObject<StoredAccess>();
	} catch (error) {
		if (isDuplicateKey(error)) return null;
		throw error;
	}
}

export async function changeAccess(guildId: string, userId: string, areas: AccessArea[]): Promise<StoredAccess | null> {
	return DashboardAccess.findOneAndUpdate({ guildId, userId }, { $set: { areas } }, { new: true })
		.select(FIELDS)
		.lean<StoredAccess>()
		.exec();
}

export async function removeAccess(guildId: string, userId: string): Promise<boolean> {
	return (await DashboardAccess.deleteOne({ guildId, userId }).exec()).deletedCount > 0;
}

/** Matches only a record not seen lately, so most requests write nothing. */
export async function markAccessSeen(guildId: string, userId: string, now: Date = new Date()): Promise<void> {
	await DashboardAccess.updateOne(
		{
			guildId,
			userId,
			$or: [{ lastSeenAt: null }, { lastSeenAt: { $lt: new Date(now.getTime() - SEEN_EVERY_MS) } }],
		},
		{ $set: { lastSeenAt: now } },
		{ timestamps: false },
	).exec();
}

export async function purgeDashboardAccess(guildId: string): Promise<void> {
	await DashboardAccess.deleteMany({ guildId }).exec();
}
