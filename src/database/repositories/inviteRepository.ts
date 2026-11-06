import { CACHE, DAY_MS } from "@config/constants";
import {
	InviteJoin,
	type InviteJoinRecord,
	InviteSettingsConfig,
	type InviteSettingsRecord,
} from "@database/models/invite.schema";
import { INVITE_LIMITS } from "@testify/shared";

export type StoredInviteSettings = Pick<InviteSettingsRecord, "enabled" | "logChannelId">;

export type StoredInviteJoin = Omit<InviteJoinRecord, "expiresAt">;

/** Read on every join, so the answer is cached and replaced on every write. */
const cache = new Map<string, { settings: StoredInviteSettings | null; expiresAt: number }>();

const JOIN_FIELDS = "guildId memberId memberName inviterId inviterName code vanity joinedAt leftAt";

export async function getInviteSettings(guildId: string): Promise<StoredInviteSettings | null> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.settings;

	const settings = await InviteSettingsConfig.findOne({ guildId })
		.select("enabled logChannelId")
		.lean<StoredInviteSettings>()
		.exec();
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { settings, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return settings;
}

export async function saveInviteSettings(
	guildId: string,
	changes: Partial<StoredInviteSettings>,
	updatedBy: string | null,
): Promise<void> {
	try {
		await InviteSettingsConfig.updateOne(
			{ guildId },
			{ $set: { ...changes, updatedBy } },
			{ upsert: true, setDefaultsOnInsert: true },
		).exec();
	} finally {
		cache.delete(guildId);
	}
}

/** The servers tracking invites, whose invites are read once the bot is ready. */
export async function inviteGuildIds(): Promise<string[]> {
	const rows = await InviteSettingsConfig.find({ enabled: true })
		.select("guildId")
		.lean<{ guildId: string }[]>()
		.exec();
	return rows.map((row) => row.guildId);
}

export async function recordJoin(join: Omit<StoredInviteJoin, "leftAt">): Promise<void> {
	await InviteJoin.create({
		...join,
		leftAt: null,
		expiresAt: new Date(join.joinedAt.getTime() + INVITE_LIMITS.keepDays * DAY_MS),
	});
}

/** Marks the member's latest join as over, so their inviter's count says who stayed. */
export async function markLeft(guildId: string, memberId: string, at: Date = new Date()): Promise<void> {
	await InviteJoin.findOneAndUpdate(
		{ guildId, memberId, leftAt: null },
		{ $set: { leftAt: at } },
		{ sort: { joinedAt: -1 } },
	).exec();
}

export async function latestJoinOf(guildId: string, memberId: string): Promise<StoredInviteJoin | null> {
	return InviteJoin.findOne({ guildId, memberId })
		.sort({ joinedAt: -1 })
		.select(JOIN_FIELDS)
		.lean<StoredInviteJoin>()
		.exec();
}

export async function recentJoins(guildId: string, limit: number): Promise<StoredInviteJoin[]> {
	return InviteJoin.find({ guildId })
		.sort({ joinedAt: -1 })
		.limit(limit)
		.select(JOIN_FIELDS)
		.lean<StoredInviteJoin[]>()
		.exec();
}

export interface StoredStanding {
	inviterId: string;
	inviterName: string;
	joins: number;
	left: number;
}

/** Ranked by members who stayed, so a burst of joins that all left again does not top the board. */
export async function topInviters(guildId: string, limit: number): Promise<StoredStanding[]> {
	return InviteJoin.aggregate<StoredStanding>([
		{ $match: { guildId, inviterId: { $ne: null } } },
		{ $sort: { joinedAt: -1 } },
		{
			$group: {
				_id: "$inviterId",
				inviterName: { $first: "$inviterName" },
				joins: { $sum: 1 },
				left: { $sum: { $cond: [{ $eq: ["$leftAt", null] }, 0, 1] } },
			},
		},
		{ $addFields: { stayed: { $subtract: ["$joins", "$left"] } } },
		{ $sort: { stayed: -1, joins: -1, _id: 1 } },
		{ $limit: limit },
		{ $project: { _id: 0, inviterId: "$_id", inviterName: 1, joins: 1, left: 1 } },
	]).exec();
}

export async function standingOf(guildId: string, inviterId: string): Promise<{ joins: number; left: number }> {
	const [joins, left] = await Promise.all([
		InviteJoin.countDocuments({ guildId, inviterId }).exec(),
		InviteJoin.countDocuments({ guildId, inviterId, leftAt: { $ne: null } }).exec(),
	]);
	return { joins, left };
}

export async function purgeInvites(guildId: string): Promise<void> {
	await Promise.all([InviteJoin.deleteMany({ guildId }).exec(), InviteSettingsConfig.deleteMany({ guildId }).exec()]);
	cache.delete(guildId);
}

export function clearInviteCache(): void {
	cache.clear();
}
