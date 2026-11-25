import { AfkStatus, type AfkRecord } from "@database/models/afk.schema";
import { ReadCache } from "@database/readCache.util";

export type StoredAfk = Pick<AfkRecord, "userId" | "note" | "updatedAt">;

/** Who is away in each server, asked on every message, so it is cached and forgotten on every write. */
const away = new ReadCache<ReadonlySet<string>>();

async function awayIn(guildId: string): Promise<ReadonlySet<string>> {
	return away.read(guildId, async () => {
		const rows = await AfkStatus.find({ guildId }, { userId: 1 }).lean<Pick<AfkRecord, "userId">[]>().exec();
		return new Set(rows.map((row) => row.userId));
	});
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

	away.forget(guildId);
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
	away.forget(guildId);
	return row === null ? null : toAfk(row);
}

/** Used by the tests, and after somebody deletes their data, so nobody is remembered as away. */
export function clearAfkCache(): void {
	away.clear();
}

export async function purgeAfk(guildId: string): Promise<void> {
	await AfkStatus.deleteMany({ guildId }).exec();
	away.forget(guildId);
}
