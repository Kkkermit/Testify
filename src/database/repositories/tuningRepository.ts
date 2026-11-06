import { CACHE } from "@config/constants";
import { TuningConfig, type TuningRecord } from "@database/models/tuning.schema";
import { type ServerTuning, type TuningPatch, tuningOf } from "@testify/shared";

/** Read on every message that earns XP, so the answer is cached and replaced on every write. */
const cache = new Map<string, { tuning: ServerTuning; expiresAt: number }>();

const FIELDS = "payRate startingWallet robbing xpRate xpCooldownSeconds";

export async function getTuning(guildId: string): Promise<ServerTuning> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.tuning;

	const stored = await TuningConfig.findOne({ guildId }).select(FIELDS).lean<Partial<TuningRecord>>().exec();
	const tuning = tuningOf(stored);
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { tuning, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return tuning;
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
		cache.delete(guildId);
	}
	return getTuning(guildId);
}

export async function purgeTuning(guildId: string): Promise<void> {
	await TuningConfig.deleteMany({ guildId }).exec();
	cache.delete(guildId);
}

export function clearTuningCache(): void {
	cache.clear();
}
