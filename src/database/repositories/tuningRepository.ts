import { TuningConfig, type TuningRecord } from "@database/models/tuning.schema";
import { ReadCache } from "@database/readCache.util";
import { type ServerTuning, type TuningPatch, tuningOf } from "@testify/shared";

/** Read on every message that earns XP, so the answer is cached and replaced on every write. */
const cache = new ReadCache<ServerTuning>();

const FIELDS = "payRate startingWallet robbing xpRate xpCooldownSeconds";

export async function getTuning(guildId: string): Promise<ServerTuning> {
	return cache.read(guildId, async () =>
		tuningOf(await TuningConfig.findOne({ guildId }).select(FIELDS).lean<Partial<TuningRecord>>().exec()),
	);
}

export async function saveTuning(
	guildId: string,
	changes: TuningPatch,
	updatedBy: string | null,
): Promise<ServerTuning> {
	const set = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
	try {
		await TuningConfig.updateOne(
			{ guildId },
			{ $set: { ...set, updatedBy } },
			{ upsert: true, setDefaultsOnInsert: true },
		).exec();
	} finally {
		cache.forget(guildId);
	}
	return getTuning(guildId);
}

export async function purgeTuning(guildId: string): Promise<void> {
	await TuningConfig.deleteMany({ guildId }).exec();
	cache.forget(guildId);
}

export function clearTuningCache(): void {
	cache.clear();
}
