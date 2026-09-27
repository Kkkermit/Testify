import { CACHE } from "@config/constants";
import { type CasinoHandRecord, CasinoHand } from "@database/models/casinoHand.schema";
import { type CasinoSettingsRecord, CasinoSettingsConfig } from "@database/models/casinoSettings.schema";

/** The casino's settings, cached like the prefix, and the card hands in play. */

export type StoredCasinoSettings = Pick<CasinoSettingsRecord, "enabled" | "disabledGames" | "minBet" | "maxBet"> | null;

type SettingsFields = Pick<CasinoSettingsRecord, "enabled" | "disabledGames" | "minBet" | "maxBet">;

const cache = new Map<string, { record: StoredCasinoSettings; expiresAt: number }>();

function remember(guildId: string, record: StoredCasinoSettings): StoredCasinoSettings {
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(guildId, { record, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });

	return record;
}

export async function getCasinoSettings(guildId: string): Promise<StoredCasinoSettings> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.record;

	const record = await CasinoSettingsConfig.findOne({ guildId })
		.select("enabled disabledGames minBet maxBet")
		.lean<SettingsFields>()
		.exec();

	return remember(guildId, record ?? null);
}

export async function saveCasinoSettings(
	guildId: string,
	fields: SettingsFields,
	updatedBy: string | null,
): Promise<void> {
	await CasinoSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...fields, updatedBy } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec();

	cache.delete(guildId);
}

export type HandRecord = Pick<
	CasinoHandRecord,
	| "_id"
	| "guildId"
	| "userId"
	| "game"
	| "bet"
	| "staked"
	| "state"
	| "version"
	| "channelId"
	| "messageId"
	| "expiresAt"
>;

function isDuplicateKey(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/** Null when the player already has a hand of this game here: the unique index decides, so two starts cannot race. */
export async function openHand(
	hand: Pick<CasinoHandRecord, "guildId" | "userId" | "game" | "bet" | "staked" | "state" | "expiresAt">,
): Promise<HandRecord | null> {
	try {
		const created = await CasinoHand.create({ ...hand, version: 0 });
		return created.toObject<HandRecord>();
	} catch (error) {
		if (isDuplicateKey(error)) return null;
		throw error;
	}
}

export async function findHand(
	guildId: string,
	userId: string,
	game: CasinoHandRecord["game"],
): Promise<HandRecord | null> {
	return CasinoHand.findOne({ guildId, userId, game }).lean<HandRecord>().exec();
}

/** Moves a hand on only if nobody else has since; false means this press lost the race. */
export async function advanceHand(
	hand: Pick<HandRecord, "_id" | "version">,
	changes: Partial<Pick<CasinoHandRecord, "state" | "staked" | "expiresAt">>,
): Promise<boolean> {
	const result = await CasinoHand.updateOne(
		{ _id: hand._id, version: hand.version },
		{ $set: changes, $inc: { version: 1 } },
	).exec();

	return result.modifiedCount === 1;
}

/** Takes the hand off the table for settling; whoever gets it back is the one that pays out. */
export async function claimHand(hand: Pick<HandRecord, "_id" | "version">): Promise<HandRecord | null> {
	return CasinoHand.findOneAndDelete({ _id: hand._id, version: hand.version }).lean<HandRecord>().exec();
}

export async function attachHandMessage(
	hand: Pick<HandRecord, "_id">,
	channelId: string,
	messageId: string,
): Promise<void> {
	await CasinoHand.updateOne({ _id: hand._id }, { $set: { channelId, messageId } }).exec();
}

export async function expiredHands(now: Date, limit: number): Promise<HandRecord[]> {
	return CasinoHand.find({ expiresAt: { $lte: now } })
		.sort({ expiresAt: 1 })
		.limit(limit)
		.lean<HandRecord[]>()
		.exec();
}

export async function purgeCasino(guildId: string): Promise<void> {
	cache.delete(guildId);
	await Promise.all([CasinoSettingsConfig.deleteMany({ guildId }).exec(), CasinoHand.deleteMany({ guildId }).exec()]);
}
