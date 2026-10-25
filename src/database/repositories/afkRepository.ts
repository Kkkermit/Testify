import { CACHE } from "@config/constants";
import { AfkStatus, type AfkRecord } from "@database/models/afk.schema";

export type StoredAfk = Pick<AfkRecord, "userId" | "note" | "updatedAt">;

/** Who is away in each server, asked on every message, so it is cached and kept in step with every write. */
const away = new Map<string, { userIds: Set<string>; expiresAt: number }>();

async function awayIn(guildId: string): Promise<Set<string>> {
	const cached = away.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.userIds;

	const rows = await AfkStatus.find({ guildId }, { userId: 1 }).lean<Pick<AfkRecord, "userId">[]>().exec();
	if (away.size > CACHE.guildSettingsMaxEntries) away.clear();
	const userIds = new Set(rows.map((row) => row.userId));
	away.set(guildId, { userIds, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return userIds;
}

function toAfk(row: AfkRecord): StoredAfk {
	return { userId: row.userId, note: row.note, updatedAt: row.updatedAt };
}

export async function setAfk(guildId: string, userId: string, note: string): Promise<StoredAfk> {
	const row = await AfkStatus.findOneAndUpdate(
		{ guildId, userId },
		{ $set: { note } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.lean<AfkRecord>()
		.exec();

	(await awayIn(guildId)).add(userId);
	return toAfk(row);
}

/** The members of `userIds` who are away, asking the database only about those the cache says are. */
export async function findAway(guildId: string, userIds: readonly string[]): Promise<StoredAfk[]> {
	if (userIds.length === 0) return [];
	const set = await awayIn(guildId);
	const wanted = userIds.filter((userId) => set.has(userId));
	if (wanted.length === 0) return [];

	const rows = await AfkStatus.find({ guildId, userId: { $in: wanted } })
		.lean<AfkRecord[]>()
		.exec();
	return rows.map(toAfk);
}

/** The note that was cleared, or null when they were not away. */
export async function clearAfk(guildId: string, userId: string): Promise<StoredAfk | null> {
	const set = await awayIn(guildId);
	if (!set.has(userId)) return null;

	const row = await AfkStatus.findOneAndDelete({ guildId, userId }).lean<AfkRecord>().exec();
	set.delete(userId);
	return row === null ? null : toAfk(row);
}

/** Used by the tests, so no suite inherits another's idea of who is away. */
export function clearAfkCache(): void {
	away.clear();
}

export async function purgeAfk(guildId: string): Promise<void> {
	away.delete(guildId);
	await AfkStatus.deleteMany({ guildId }).exec();
}
