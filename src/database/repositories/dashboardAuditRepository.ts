import { type FilterQuery } from "mongoose";
import { type DashboardAudit, DashboardAudits } from "@database/models/dashboardAudit.schema";

export type NewAudit = Omit<DashboardAudit, "at">;

/** Who the records are read for: a reader without Moderate Members is not shown moderation, as `/case list` is not. */
export interface AuditAudience {
	moderation: boolean;
}

const EVERYTHING: AuditAudience = { moderation: true };

const MODERATION_ACTION = /^member\.(?:warn|kick|ban|unban|softban|timeout)(?:\.|$)/;

function scopeOf(guildId: string, reader: AuditAudience): FilterQuery<DashboardAudit> {
	return reader.moderation ? { guildId } : { guildId, action: { $not: MODERATION_ACTION } };
}

export async function recordAudit(entry: NewAudit): Promise<void> {
	await DashboardAudits.create({ ...entry, at: new Date() });
}

/** `_id` breaks ties so the order is total, or a paged read can repeat one record and skip another. */
export async function recentAudits(guildId: string, limit = 20, reader = EVERYTHING): Promise<DashboardAudit[]> {
	return DashboardAudits.find(scopeOf(guildId, reader))
		.sort({ at: -1, _id: -1 })
		.limit(limit)
		.lean<DashboardAudit[]>()
		.exec();
}

export async function auditPage(
	guildId: string,
	page: number,
	perPage = 25,
	reader = EVERYTHING,
): Promise<DashboardAudit[]> {
	return DashboardAudits.find(scopeOf(guildId, reader))
		.sort({ at: -1, _id: -1 })
		.skip(Math.max(0, page - 1) * perPage)
		.limit(perPage)
		.lean<DashboardAudit[]>()
		.exec();
}

export async function countAudits(guildId: string, reader = EVERYTHING): Promise<number> {
	return DashboardAudits.countDocuments(scopeOf(guildId, reader)).exec();
}

/** A server's records since a moment, newest first, capped so a busy fortnight cannot come back whole. */
export async function auditsSince(
	guildId: string,
	since: Date,
	limit = 500,
	reader = EVERYTHING,
): Promise<DashboardAudit[]> {
	return DashboardAudits.find({ ...scopeOf(guildId, reader), at: { $gte: since } })
		.sort({ at: -1, _id: -1 })
		.limit(limit)
		.lean<DashboardAudit[]>()
		.exec();
}
