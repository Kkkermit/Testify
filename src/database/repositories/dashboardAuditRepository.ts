import { type DashboardAudit, DashboardAudits } from "@database/models/dashboardAudit.schema";

export type NewAudit = Omit<DashboardAudit, "at">;

export async function recordAudit(entry: NewAudit): Promise<void> {
	await DashboardAudits.create({ ...entry, at: new Date() });
}

/** `_id` breaks ties so the order is total, or a paged read can repeat one record and skip another. */
export async function recentAudits(guildId: string, limit = 20): Promise<DashboardAudit[]> {
	return DashboardAudits.find({ guildId }).sort({ at: -1, _id: -1 }).limit(limit).lean<DashboardAudit[]>().exec();
}

export async function auditPage(guildId: string, page: number, perPage = 25): Promise<DashboardAudit[]> {
	return DashboardAudits.find({ guildId })
		.sort({ at: -1, _id: -1 })
		.skip(Math.max(0, page - 1) * perPage)
		.limit(perPage)
		.lean<DashboardAudit[]>()
		.exec();
}

export async function countAudits(guildId: string): Promise<number> {
	return DashboardAudits.countDocuments({ guildId }).exec();
}

/** A server's records since a moment, newest first, capped so a busy fortnight cannot come back whole. */
export async function auditsSince(guildId: string, since: Date, limit = 500): Promise<DashboardAudit[]> {
	return DashboardAudits.find({ guildId, at: { $gte: since } })
		.sort({ at: -1, _id: -1 })
		.limit(limit)
		.lean<DashboardAudit[]>()
		.exec();
}
