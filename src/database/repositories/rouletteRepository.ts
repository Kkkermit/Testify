import { isValidObjectId } from "mongoose";
import { type RouletteBetRecord, RouletteRound, type RouletteRoundRecord } from "@database/models/rouletteRound.schema";

/** Shared roulette rounds: every change is one conditional update, so presses from many players cannot race. */

export type RoundRecord = RouletteRoundRecord;

function isDuplicateKey(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/** Null when a round is already open on that message. */
export async function openRound(
	round: Pick<
		RouletteRoundRecord,
		"guildId" | "channelId" | "messageId" | "hostId" | "hostName" | "private" | "chip" | "closesAt" | "expiresAt"
	>,
): Promise<RoundRecord | null> {
	try {
		const created = await RouletteRound.create({ ...round, status: "betting", pocket: null, players: {} });
		return created.toObject<RoundRecord>();
	} catch (error) {
		if (isDuplicateKey(error)) return null;
		throw error;
	}
}

export async function attachRoundMessage(roundId: string, messageId: string): Promise<void> {
	await RouletteRound.updateOne({ _id: roundId }, { $set: { messageId } }).exec();
}

export async function findRound(roundId: string): Promise<RoundRecord | null> {
	if (!isValidObjectId(roundId)) return null;
	return RouletteRound.findById(roundId).lean<RoundRecord>().exec();
}

/**
 * Adds bets only while the round is open and the player stays within `maxBets`; null means nothing was added, and the
 * caller hands the stake back.
 */
export async function addBets(
	roundId: string,
	player: { userId: string; name: string },
	bets: RouletteBetRecord[],
	maxBets: number,
	now: number,
): Promise<RoundRecord | null> {
	if (!isValidObjectId(roundId) || bets.length === 0 || bets.length > maxBets) return null;
	const seat = `players.${player.userId}`;

	return RouletteRound.findOneAndUpdate(
		{
			_id: roundId,
			status: "betting",
			$or: [{ closesAt: null }, { closesAt: { $gt: new Date(now) } }],
			[`${seat}.bets.${String(maxBets - bets.length)}`]: { $exists: false },
		},
		{
			$push: { [`${seat}.bets`]: { $each: bets } },
			$set: { [`${seat}.name`]: player.name },
			$min: { [`${seat}.joinedAt`]: now },
		},
		{ new: true },
	)
		.lean<RoundRecord>()
		.exec();
}

/** Starts the countdown if nobody has yet; true only for the call that started it, which is the one to set a timer. */
export async function startClock(roundId: string, closesAt: Date, expiresAt: Date): Promise<boolean> {
	if (!isValidObjectId(roundId)) return false;

	const result = await RouletteRound.updateOne(
		{ _id: roundId, status: "betting", closesAt: null },
		{ $set: { closesAt, expiresAt } },
	).exec();
	return result.modifiedCount === 1;
}

export async function setSeatChip(
	roundId: string,
	player: { userId: string; name: string },
	chip: number,
	now: number,
): Promise<RoundRecord | null> {
	if (!isValidObjectId(roundId)) return null;
	const seat = `players.${player.userId}`;

	return RouletteRound.findOneAndUpdate(
		{ _id: roundId, status: "betting" },
		{ $set: { [`${seat}.chip`]: chip, [`${seat}.name`]: player.name }, $min: { [`${seat}.joinedAt`]: now } },
		{ new: true },
	)
		.lean<RoundRecord>()
		.exec();
}

/** Takes a player's chips off an open table; the round as it was before tells the caller what to hand back. */
export async function clearBets(roundId: string, userId: string): Promise<RoundRecord | null> {
	if (!isValidObjectId(roundId)) return null;

	return RouletteRound.findOneAndUpdate(
		{ _id: roundId, status: "betting", [`players.${userId}.bets.0`]: { $exists: true } },
		{ $set: { [`players.${userId}.bets`]: [] } },
		{ new: false },
	)
		.lean<RoundRecord>()
		.exec();
}

/** Closes the table on one pocket; whoever gets the round back is the one that pays. */
export async function claimRound(roundId: string, pocket: number): Promise<RoundRecord | null> {
	if (!isValidObjectId(roundId)) return null;

	return RouletteRound.findOneAndUpdate(
		{ _id: roundId, status: "betting" },
		{ $set: { status: "spinning", pocket } },
		{ new: true },
	)
		.lean<RoundRecord>()
		.exec();
}

export async function finishRound(roundId: string): Promise<void> {
	await RouletteRound.updateOne({ _id: roundId }, { $set: { status: "settled" } }).exec();
}

/** Rounds still open well past their close, which a restart left without a timer. */
export async function overdueRounds(before: Date, limit: number): Promise<RoundRecord[]> {
	return RouletteRound.find({ status: "betting", closesAt: { $lte: before } })
		.sort({ closesAt: 1 })
		.limit(limit)
		.lean<RoundRecord[]>()
		.exec();
}

export async function purgeRounds(guildId: string): Promise<void> {
	await RouletteRound.deleteMany({ guildId }).exec();
}
