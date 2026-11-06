import { isValidObjectId, type Types } from "mongoose";
import {
	Appeal,
	type AppealRecord,
	AppealSettingsConfig,
	type AppealSettingsRecord,
} from "@database/models/appeal.schema";
import { APPEAL_LIMITS, type AppealFilter, type AppealStatus } from "@testify/shared";

type StoredAppealSettings = Pick<AppealSettingsRecord, "enabled" | "channelId" | "cooldownDays">;

export type StoredAppeal = Omit<AppealRecord, "updatedAt" | "expiresAt"> & { id: string };

type Lean = AppealRecord & { _id: Types.ObjectId };

function toAppeal(row: Lean): StoredAppeal {
	return {
		id: row._id.toString(),
		guildId: row.guildId,
		userId: row.userId,
		username: row.username,
		text: row.text,
		status: row.status,
		reason: row.reason,
		decidedBy: row.decidedBy ?? null,
		decidedByName: row.decidedByName ?? null,
		decidedAt: row.decidedAt ?? null,
		channelId: row.channelId ?? null,
		messageId: row.messageId ?? null,
		createdAt: row.createdAt,
	};
}

/** Every lookup by id is scoped to the server too, so one server's staff can never reach another's appeal. */
function scope(guildId: string, appealId: string): { guildId: string; _id: string } | null {
	return isValidObjectId(appealId) ? { guildId, _id: appealId } : null;
}

const SETTINGS = "enabled channelId cooldownDays";

export async function getAppealSettings(guildId: string): Promise<StoredAppealSettings | null> {
	return AppealSettingsConfig.findOne({ guildId }).select(SETTINGS).lean<StoredAppealSettings>().exec();
}

export async function saveAppealSettings(
	guildId: string,
	changes: Partial<StoredAppealSettings>,
	updatedBy: string | null,
): Promise<void> {
	await AppealSettingsConfig.updateOne(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, setDefaultsOnInsert: true },
	).exec();
}

/** The servers that take appeals at all, which is the only place a banned person's servers are looked for. */
export async function appealGuildIds(): Promise<string[]> {
	const rows = await AppealSettingsConfig.find({ enabled: true, channelId: { $ne: null } })
		.select("guildId")
		.lean<{ guildId: string }[]>()
		.exec();
	return rows.map((row) => row.guildId);
}

/** Null when this person already has an appeal waiting here, which the unique index decides rather than a read. */
export async function createAppeal(
	fields: Pick<AppealRecord, "guildId" | "userId" | "username" | "text">,
): Promise<StoredAppeal | null> {
	try {
		const doc = await Appeal.create({ ...fields, status: "open" });
		return toAppeal(doc.toObject<Lean>());
	} catch (error) {
		if ((error as { code?: number }).code === 11_000) return null;
		throw error;
	}
}

export async function findAppeal(guildId: string, appealId: string): Promise<StoredAppeal | null> {
	const filter = scope(guildId, appealId);
	if (filter === null) return null;

	const row = await Appeal.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toAppeal(row);
}

/** This person's newest appeal to this server, whatever became of it. */
export async function latestAppeal(guildId: string, userId: string): Promise<StoredAppeal | null> {
	const row = await Appeal.findOne({ guildId, userId }).sort({ createdAt: -1 }).lean<Lean>().exec();
	return row === null ? null : toAppeal(row);
}

export async function userAppeals(userId: string, limit = 50): Promise<StoredAppeal[]> {
	const rows = await Appeal.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean<Lean[]>().exec();
	return rows.map(toAppeal);
}

export async function setAppealMessage(
	guildId: string,
	appealId: string,
	place: { channelId: string; messageId: string },
): Promise<void> {
	const filter = scope(guildId, appealId);
	if (filter !== null) await Appeal.updateOne(filter, { $set: place }).exec();
}

/** Only an appeal still waiting can be decided, so two staff deciding at once cannot both act; null for the second. */
export async function decideAppeal(
	guildId: string,
	appealId: string,
	decision: { status: Exclude<AppealStatus, "open">; reason: string; by: string; byName: string; at: Date },
): Promise<StoredAppeal | null> {
	const filter = scope(guildId, appealId);
	if (filter === null) return null;

	const row = await Appeal.findOneAndUpdate(
		{ ...filter, status: "open" },
		{
			$set: {
				status: decision.status,
				reason: decision.reason,
				decidedBy: decision.by,
				decidedByName: decision.byName,
				decidedAt: decision.at,
				expiresAt: new Date(decision.at.getTime() + APPEAL_LIMITS.keepDays * 86_400_000),
			},
		},
		{ new: true },
	)
		.lean<Lean>()
		.exec();
	return row === null ? null : toAppeal(row);
}

/** Puts a claimed decision back, for an unban Discord refused after the appeal was marked accepted. */
export async function reopenAppeal(guildId: string, appealId: string): Promise<void> {
	const filter = scope(guildId, appealId);
	if (filter === null) return;

	await Appeal.updateOne(filter, {
		$set: { status: "open", reason: "", decidedBy: null, decidedByName: null, decidedAt: null, expiresAt: null },
	}).exec();
}

export async function deleteAppeal(guildId: string, appealId: string): Promise<void> {
	const filter = scope(guildId, appealId);
	if (filter !== null) await Appeal.deleteOne(filter).exec();
}

export async function listAppeals(
	guildId: string,
	status: AppealFilter,
	page: { skip: number; limit: number },
): Promise<{ items: StoredAppeal[]; total: number }> {
	const filter = status === "all" ? { guildId } : { guildId, status };
	const [rows, total] = await Promise.all([
		Appeal.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean<Lean[]>().exec(),
		Appeal.countDocuments(filter).exec(),
	]);

	return { items: rows.map(toAppeal), total };
}

export async function countOpenAppeals(guildId: string): Promise<number> {
	return Appeal.countDocuments({ guildId, status: "open" }).exec();
}

export async function purgeAppeals(guildId: string): Promise<void> {
	await Promise.all([Appeal.deleteMany({ guildId }).exec(), AppealSettingsConfig.deleteMany({ guildId }).exec()]);
}
