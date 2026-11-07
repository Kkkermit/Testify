import { type FilterQuery, type Types } from "mongoose";
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

function byActor(actorId: string, guildId?: string): FilterQuery<DashboardAudit> {
	return guildId === undefined ? { actorId } : { actorId, guildId };
}

/** One person's own records, newest first, in every server or in one. */
export async function auditsBy(
	actorId: string,
	page: number,
	perPage: number,
	guildId?: string,
): Promise<{ items: (DashboardAudit & { _id: Types.ObjectId })[]; total: number }> {
	const filter = byActor(actorId, guildId);
	const [items, total] = await Promise.all([
		DashboardAudits.find(filter)
			.sort({ at: -1, _id: -1 })
			.skip(Math.max(0, page - 1) * perPage)
			.limit(perPage)
			.lean<(DashboardAudit & { _id: Types.ObjectId })[]>()
			.exec(),
		DashboardAudits.countDocuments(filter).exec(),
	]);

	return { items, total };
}

export interface ChangeTally {
	count: number;
	last: Date;
}

/** How many changes each of these people made in one server, and when the latest was, in one query. */
export async function changesBy(guildId: string, actorIds: readonly string[]): Promise<Map<string, ChangeTally>> {
	if (actorIds.length === 0) return new Map();

	const rows = await DashboardAudits.aggregate<{ _id: string; count: number; last: Date }>([
		{ $match: { guildId, actorId: { $in: [...actorIds] } } },
		{ $group: { _id: "$actorId", count: { $sum: 1 }, last: { $max: "$at" } } },
	]).exec();
	return new Map(rows.map((row) => [row._id, { count: row.count, last: row.last }]));
}

/** Every server one person has a record in; null is the owner console. */
export async function auditServersOf(actorId: string): Promise<(string | null)[]> {
	return DashboardAudits.distinct("guildId", { actorId }).exec();
}
