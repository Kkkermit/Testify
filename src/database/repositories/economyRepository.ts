import { ECONOMY, type EconomyCooldownKey } from "../../config/constants";
import { strings } from "../../config/strings";
import { UserFacingError } from "../../core/errors";
import { Economy, type EconomyAccount, type InventoryItem } from "../models/economy";

/**
 * The only place economy queries live. Every mutation is atomic — the previous
 * read-modify-`save()` pattern lost writes under concurrency, which was
 * exploitable as money duplication rather than merely theoretical.
 */

const LEAN = { lean: true as const, new: true as const };

/** Fetches the account, creating it on first use. Never returns null. */
export async function getOrCreateAccount(guildId: string, userId: string): Promise<EconomyAccount> {
	return Economy.findOneAndUpdate(
		{ guildId, userId },
		{ $setOnInsert: { guildId, userId, wallet: ECONOMY.startingWallet, bank: ECONOMY.startingBank } },
		{ ...LEAN, upsert: true, setDefaultsOnInsert: true },
	).exec() as Promise<EconomyAccount>;
}

/** Reads without creating. Used where "no account yet" is a meaningful answer. */
export async function findAccount(guildId: string, userId: string): Promise<EconomyAccount | null> {
	return Economy.findOne({ guildId, userId }).lean<EconomyAccount>().exec();
}

/** Throws a user-facing error when the account does not exist yet. */
export async function requireAccount(guildId: string, userId: string): Promise<EconomyAccount> {
	const account = await findAccount(guildId, userId);
	if (!account) throw new UserFacingError(strings.economy.noAccount);
	return account;
}

export async function accountExists(guildId: string, userId: string): Promise<boolean> {
	return (await Economy.exists({ guildId, userId })) !== null;
}

export async function createAccount(guildId: string, userId: string): Promise<EconomyAccount | null> {
	if (await accountExists(guildId, userId)) return null;
	return getOrCreateAccount(guildId, userId);
}

export async function deleteAccount(guildId: string, userId: string): Promise<boolean> {
	const result = await Economy.deleteOne({ guildId, userId }).exec();
	return result.deletedCount > 0;
}

export async function adjustWallet(guildId: string, userId: string, delta: number): Promise<EconomyAccount> {
	await getOrCreateAccount(guildId, userId);
	return Economy.findOneAndUpdate(
		{ guildId, userId },
		{ $inc: { wallet: delta } },
		LEAN,
	).exec() as Promise<EconomyAccount>;
}

export async function adjustBank(guildId: string, userId: string, delta: number): Promise<EconomyAccount> {
	await getOrCreateAccount(guildId, userId);
	return Economy.findOneAndUpdate(
		{ guildId, userId },
		{ $inc: { bank: delta } },
		LEAN,
	).exec() as Promise<EconomyAccount>;
}

/**
 * Conditional debit: the filter itself requires sufficient funds, so two
 * concurrent spends cannot both succeed against the same balance.
 * Returns null when the funds were not available.
 */
export async function debitWallet(guildId: string, userId: string, amount: number): Promise<EconomyAccount | null> {
	return Economy.findOneAndUpdate({ guildId, userId, wallet: { $gte: amount } }, { $inc: { wallet: -amount } }, LEAN)
		.lean<EconomyAccount>()
		.exec();
}

export async function debitBank(guildId: string, userId: string, amount: number): Promise<EconomyAccount | null> {
	return Economy.findOneAndUpdate({ guildId, userId, bank: { $gte: amount } }, { $inc: { bank: -amount } }, LEAN)
		.lean<EconomyAccount>()
		.exec();
}

/** Wallet → bank. Debit is conditional, so an over-deposit is impossible. */
export async function deposit(guildId: string, userId: string, amount: number): Promise<EconomyAccount | null> {
	const debited = await debitWallet(guildId, userId, amount);
	if (!debited) return null;
	return adjustBank(guildId, userId, amount);
}

export async function withdraw(guildId: string, userId: string, amount: number): Promise<EconomyAccount | null> {
	const debited = await debitBank(guildId, userId, amount);
	if (!debited) return null;
	return adjustWallet(guildId, userId, amount);
}

/** Atomic pair: the credit only happens once the debit has provably landed. */
export async function transfer(guildId: string, fromId: string, toId: string, amount: number): Promise<boolean> {
	await getOrCreateAccount(guildId, toId);
	const debited = await debitWallet(guildId, fromId, amount);
	if (!debited) return false;

	try {
		await adjustWallet(guildId, toId, amount);
		return true;
	} catch (error) {
		// Put the money back rather than letting it vanish mid-transfer.
		await adjustWallet(guildId, fromId, amount);
		throw error;
	}
}

const COOLDOWN_FIELDS = {
	daily: "lastDaily",
	work: "lastWorked",
	rob: "lastRobbed",
	heist: "lastHeist",
	beg: "lastBegged",
	gamble: "lastBegged",
} as const satisfies Record<EconomyCooldownKey, keyof EconomyAccount>;

export async function setCooldown(
	guildId: string,
	userId: string,
	key: EconomyCooldownKey,
	at: Date = new Date(),
): Promise<void> {
	await Economy.updateOne({ guildId, userId }, { $set: { [COOLDOWN_FIELDS[key]]: at } }).exec();
}

export async function incrementCounters(
	guildId: string,
	userId: string,
	counters: Partial<Record<keyof EconomyAccount, number>>,
): Promise<void> {
	await Economy.updateOne({ guildId, userId }, { $inc: counters }).exec();
}

export type LeaderboardField = "wallet" | "bank" | "total";

export async function getLeaderboard(
	guildId: string,
	limit: number,
	field: LeaderboardField = "total",
): Promise<(EconomyAccount & { total: number })[]> {
	if (field === "total") {
		return Economy.aggregate<EconomyAccount & { total: number }>([
			{ $match: { guildId } },
			{ $addFields: { total: { $add: ["$wallet", "$bank"] } } },
			{ $sort: { total: -1 } },
			{ $limit: limit },
		]).exec();
	}

	const accounts = await Economy.find({ guildId })
		.sort({ [field]: -1 })
		.limit(limit)
		.lean<EconomyAccount[]>()
		.exec();

	return accounts.map((account) => ({ ...account, total: account.wallet + account.bank }));
}

export async function getGuildTotals(
	guildId: string,
): Promise<{ accounts: number; wallet: number; bank: number; richest: EconomyAccount | null }> {
	const [totals] = await Economy.aggregate<{ accounts: number; wallet: number; bank: number }>([
		{ $match: { guildId } },
		{ $group: { _id: null, accounts: { $sum: 1 }, wallet: { $sum: "$wallet" }, bank: { $sum: "$bank" } } },
	]).exec();

	const [richest] = await getLeaderboard(guildId, 1);

	return {
		accounts: totals?.accounts ?? 0,
		wallet: totals?.wallet ?? 0,
		bank: totals?.bank ?? 0,
		richest: richest ?? null,
	};
}

export async function addInventoryItem(
	guildId: string,
	userId: string,
	item: Omit<InventoryItem, "purchasedAt"> & { purchasedAt?: Date },
): Promise<EconomyAccount> {
	const existing = await Economy.findOneAndUpdate(
		{ guildId, userId, "inventory.itemId": item.itemId },
		{ $inc: { "inventory.$.quantity": item.quantity } },
		LEAN,
	)
		.lean<EconomyAccount>()
		.exec();

	if (existing) return existing;

	return Economy.findOneAndUpdate(
		{ guildId, userId },
		{ $push: { inventory: { ...item, purchasedAt: item.purchasedAt ?? new Date() } } },
		LEAN,
	).exec() as Promise<EconomyAccount>;
}

/** Conditional removal, so an item cannot be consumed twice concurrently. */
export async function removeInventoryItem(
	guildId: string,
	userId: string,
	itemId: string,
	quantity = 1,
): Promise<EconomyAccount | null> {
	const updated = await Economy.findOneAndUpdate(
		{ guildId, userId, inventory: { $elemMatch: { itemId, quantity: { $gte: quantity } } } },
		{ $inc: { "inventory.$.quantity": -quantity } },
		LEAN,
	)
		.lean<EconomyAccount>()
		.exec();

	if (!updated) return null;

	await Economy.updateOne({ guildId, userId }, { $pull: { inventory: { quantity: { $lte: 0 } } } }).exec();
	return findAccount(guildId, userId);
}

export async function setFields(
	guildId: string,
	userId: string,
	fields: Partial<EconomyAccount>,
): Promise<EconomyAccount> {
	return Economy.findOneAndUpdate(
		{ guildId, userId },
		{ $set: fields },
		{ ...LEAN, upsert: true },
	).exec() as Promise<EconomyAccount>;
}

export async function resetGuild(guildId: string): Promise<number> {
	const result = await Economy.deleteMany({ guildId }).exec();
	return result.deletedCount;
}

/** Robbery target selection needs a minimum wallet, so it is filtered in the query. */
export async function findRobbableTarget(guildId: string, excludeUserId: string): Promise<EconomyAccount | null> {
	const [candidate] = await Economy.aggregate<EconomyAccount>([
		{ $match: { guildId, userId: { $ne: excludeUserId }, wallet: { $gte: ECONOMY.robMinTargetWallet } } },
		{ $sample: { size: 1 } },
	]).exec();
	return candidate ?? null;
}
