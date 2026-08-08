import { type DashboardAudit, DashboardAudits } from "@database/models/dashboardAudit.schema";

export type NewAudit = Omit<DashboardAudit, "at">;

export async function recordAudit(entry: NewAudit): Promise<void> {
	await DashboardAudits.create({ ...entry, at: new Date() });
}

/**
 * `_id` breaks the tie on every sort here. Two changes saved in the same millisecond share an `at`, and the
 * order Mongo returns tied documents in is unspecified — which for a paged read means one record can appear on
 * two pages while another is skipped entirely. An ObjectId is unique and rises with insertion, so adding it
 * makes the order total, and total is what `skip` needs to be correct.
 */
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
