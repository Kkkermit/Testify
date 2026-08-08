import { LEVELLING } from "@config/constants";
import { LevelConfig, type LevelSettings } from "@database/models/guildSettings.schema";
import { UserLevel, type UserLevelRecord } from "@database/models/levelling.schema";

const LEAN = { lean: true as const, new: true as const };

export async function getLevelSettings(guildId: string): Promise<LevelSettings | null> {
	return LevelConfig.findOne({ guildId }).lean<LevelSettings>().exec();
}

export async function saveLevelSettings(
	guildId: string,
	settings: Partial<Omit<LevelSettings, "guildId" | "createdAt" | "updatedAt">>,
): Promise<LevelSettings> {
	return LevelConfig.findOneAndUpdate(
		{ guildId },
		{ $set: settings, $setOnInsert: { guildId } },
		{ ...LEAN, upsert: true, setDefaultsOnInsert: true },
	).exec() as Promise<LevelSettings>;
}

export async function deleteLevelSettings(guildId: string): Promise<boolean> {
	const result = await LevelConfig.deleteOne({ guildId }).exec();
	return result.deletedCount > 0;
}

export async function getUserLevel(guildId: string, userId: string): Promise<UserLevelRecord | null> {
	return UserLevel.findOne({ guildId, userId }).lean<UserLevelRecord>().exec();
}

export async function getOrCreateUserLevel(guildId: string, userId: string): Promise<UserLevelRecord> {
	return UserLevel.findOneAndUpdate(
		{ guildId, userId },
		{ $setOnInsert: { guildId, userId } },
		{ ...LEAN, upsert: true, setDefaultsOnInsert: true },
	).exec() as Promise<UserLevelRecord>;
}

export interface XpResult {
	record: UserLevelRecord;
	levelledUp: boolean;
	previousLevel: number;
}

/**
 * Atomic XP award with a per-user message cooldown enforced in the query filter, which is what stops XP being farmed
 * by message spam.
 */
export async function awardXp(
	guildId: string,
	userId: string,
	amount: number,
	cooldownMs: number = LEVELLING.messageCooldownMs,
): Promise<XpResult | null> {
	const threshold = new Date(Date.now() - cooldownMs);
	const before = await getOrCreateUserLevel(guildId, userId);

	const updated = await UserLevel.findOneAndUpdate(
		{ guildId, userId, $or: [{ lastMessageAt: null }, { lastMessageAt: { $lte: threshold } }] },
		{ $inc: { xp: amount }, $set: { lastMessageAt: new Date() } },
		LEAN,
	)
		.lean<UserLevelRecord>()
		.exec();

	if (!updated) return null;

	const level = levelFromXp(updated.xp);
	if (level !== updated.level) {
		const synced = await UserLevel.findOneAndUpdate({ guildId, userId }, { $set: { level } }, LEAN)
			.lean<UserLevelRecord>()
			.exec();
		return { record: synced ?? { ...updated, level }, levelledUp: level > before.level, previousLevel: before.level };
	}

	return { record: updated, levelledUp: false, previousLevel: before.level };
}

export function levelFromXp(xp: number): number {
	let level = 0;
	while (LEVELLING.xpForLevel(level + 1) <= xp) level += 1;
	return level;
}

export function xpForNextLevel(level: number): number {
	return LEVELLING.xpForLevel(level + 1);
}

export async function setLevel(guildId: string, userId: string, level: number): Promise<UserLevelRecord> {
	return UserLevel.findOneAndUpdate(
		{ guildId, userId },
		{ $set: { level, xp: LEVELLING.xpForLevel(level) }, $setOnInsert: { guildId, userId } },
		{ ...LEAN, upsert: true, setDefaultsOnInsert: true },
	).exec() as Promise<UserLevelRecord>;
}

export async function addXp(guildId: string, userId: string, amount: number): Promise<UserLevelRecord> {
	const updated = (await UserLevel.findOneAndUpdate(
		{ guildId, userId },
		{ $inc: { xp: amount }, $setOnInsert: { guildId, userId } },
		{ ...LEAN, upsert: true, setDefaultsOnInsert: true },
	).exec()) as UserLevelRecord;

	return (
		(await UserLevel.findOneAndUpdate({ guildId, userId }, { $set: { level: levelFromXp(updated.xp) } }, LEAN)
			.lean<UserLevelRecord>()
			.exec()) ?? updated
	);
}

/** `_id` last so the order is total: level and XP tie constantly, and `skip` on a partial order repeats rows. */
export async function getLevelLeaderboard(guildId: string, limit: number, skip = 0): Promise<UserLevelRecord[]> {
	return UserLevel.find({ guildId })
		.sort({ level: -1, xp: -1, _id: 1 })
		.skip(skip)
		.limit(limit)
		.lean<UserLevelRecord[]>()
		.exec();
}

export async function countRanked(guildId: string): Promise<number> {
	return UserLevel.countDocuments({ guildId }).exec();
}

export async function getRank(guildId: string, userId: string): Promise<number | null> {
	const record = await getUserLevel(guildId, userId);
	if (!record) return null;

	const ahead = await UserLevel.countDocuments({
		guildId,
		$or: [{ level: { $gt: record.level } }, { level: record.level, xp: { $gt: record.xp } }],
	}).exec();

	return ahead + 1;
}

export async function resetGuildLevels(guildId: string): Promise<number> {
	const result = await UserLevel.deleteMany({ guildId }).exec();
	return result.deletedCount;
}
