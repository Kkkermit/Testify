import {
	ChannelDays,
	MemberDays,
	type MemberMoveRecord,
	MemberMoves,
	type ServerDay,
	ServerDays,
} from "@database/models/insights.schema";
import { INSIGHTS_LIMITS } from "@testify/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC day as `YYYY-MM-DD`, the key every per-day insights row is stored under. */
export function dayKey(at: Date = new Date()): string {
	return at.toISOString().slice(0, 10);
}

/** The oldest day still inside a window, inclusive, so `day >= since` selects it. */
export function since(days: number, now: Date = new Date()): string {
	return dayKey(new Date(now.getTime() - (days - 1) * DAY_MS));
}

function expiry(now: Date): Date {
	// A day past the window, so the oldest day a window shows is never half reaped.
	return new Date(now.getTime() + (INSIGHTS_LIMITS.retentionDays + 1) * DAY_MS);
}

export interface ActivityBatch {
	servers: { guildId: string; day: string; messages: number; hours: Record<string, number> }[];
	channels: { guildId: string; day: string; channelId: string; messages: number }[];
	members: { guildId: string; day: string; userId: string; messages: number }[];
}

/** One bulk write per collection, each row an upserted `$inc`, so a flush costs three round trips however busy. */
export async function saveActivity(batch: ActivityBatch, now: Date = new Date()): Promise<void> {
	const expiresAt = expiry(now);
	const writes: Promise<unknown>[] = [];

	if (batch.servers.length > 0) {
		writes.push(
			ServerDays.bulkWrite(
				batch.servers.map((row) => ({
					updateOne: {
						filter: { guildId: row.guildId, day: row.day },
						update: {
							$inc: {
								messages: row.messages,
								...Object.fromEntries(Object.entries(row.hours).map(([hour, count]) => [`hours.${hour}`, count])),
							},
							$setOnInsert: { expiresAt },
						},
						upsert: true,
					},
				})),
				{ ordered: false },
			),
		);
	}
	if (batch.channels.length > 0) {
		writes.push(
			ChannelDays.bulkWrite(
				batch.channels.map((row) => ({
					updateOne: {
						filter: { guildId: row.guildId, day: row.day, channelId: row.channelId },
						update: { $inc: { messages: row.messages }, $setOnInsert: { expiresAt } },
						upsert: true,
					},
				})),
				{ ordered: false },
			),
		);
	}
	if (batch.members.length > 0) {
		writes.push(
			MemberDays.bulkWrite(
				batch.members.map((row) => ({
					updateOne: {
						filter: { guildId: row.guildId, day: row.day, userId: row.userId },
						update: { $inc: { messages: row.messages }, $setOnInsert: { expiresAt } },
						upsert: true,
					},
				})),
				{ ordered: false },
			),
		);
	}

	await Promise.all(writes);
}

export async function recordMove(
	move: Pick<MemberMoveRecord, "guildId" | "userId" | "username" | "kind">,
	now: Date = new Date(),
): Promise<void> {
	const expiresAt = expiry(now);

	await Promise.all([
		MemberMoves.create({ ...move, at: now, expiresAt }),
		ServerDays.updateOne(
			{ guildId: move.guildId, day: dayKey(now) },
			{ $inc: { [move.kind === "join" ? "joins" : "leaves"]: 1 }, $setOnInsert: { expiresAt } },
			{ upsert: true },
		).exec(),
	]);
}

interface InsightRows {
	days: ServerDay[];
	channels: { channelId: string; messages: number }[];
	members: { userId: string; messages: number }[];
	activeMembers: number;
	firstDay: string | null;
}

export async function readInsightRows(guildId: string, sinceDay: string): Promise<InsightRows> {
	const match = { guildId, day: { $gte: sinceDay } };

	const [days, channels, members, first] = await Promise.all([
		ServerDays.find(match).sort({ day: 1 }).lean<ServerDay[]>().exec(),
		ChannelDays.aggregate<{ _id: string; messages: number }>([
			{ $match: match },
			{ $group: { _id: "$channelId", messages: { $sum: "$messages" } } },
			{ $sort: { messages: -1, _id: 1 } },
			{ $limit: INSIGHTS_LIMITS.topChannels },
		]).exec(),
		MemberDays.aggregate<{ top: { _id: string; messages: number }[]; count: { total: number }[] }>([
			{ $match: match },
			{ $group: { _id: "$userId", messages: { $sum: "$messages" } } },
			{
				$facet: {
					top: [{ $sort: { messages: -1, _id: 1 } }, { $limit: INSIGHTS_LIMITS.topMembers }],
					count: [{ $count: "total" }],
				},
			},
		]).exec(),
		ServerDays.findOne({ guildId }).sort({ day: 1 }).select({ day: 1 }).lean<{ day: string }>().exec(),
	]);

	const facet = members[0];
	return {
		days,
		channels: channels.map((row) => ({ channelId: row._id, messages: row.messages })),
		members: (facet?.top ?? []).map((row) => ({ userId: row._id, messages: row.messages })),
		activeMembers: facet?.count[0]?.total ?? 0,
		firstDay: first?.day ?? null,
	};
}

export async function recentMoves(guildId: string, kind: MemberMoveRecord["kind"]): Promise<MemberMoveRecord[]> {
	return MemberMoves.find({ guildId, kind })
		.sort({ at: -1 })
		.limit(INSIGHTS_LIMITS.recentMoves)
		.lean<MemberMoveRecord[]>()
		.exec();
}
