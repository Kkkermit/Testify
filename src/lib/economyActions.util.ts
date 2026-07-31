import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import {
	adjustWallet,
	getOrCreateAccount,
	removeInventoryItem,
	setFields,
} from "@database/repositories/economyRepository";
import { formatDuration, formatNumber } from "@lib/format.util";
import { findShopItem } from "@lib/shop.util";

/** Economy actions that more than one surface performs. */

export interface DailyResult {
	claimed: boolean;
	/** Ready-to-show sentence, whether it succeeded or not. */
	message: string;
	reward?: number;
	streak?: number;
}

export async function claimDaily(guildId: string, userId: string, now = Date.now()): Promise<DailyResult> {
	const account = await getOrCreateAccount(guildId, userId);

	if (account.lastDaily !== null) {
		const readyAt = account.lastDaily.getTime() + ECONOMY_COOLDOWNS.daily;
		if (now < readyAt) {
			return {
				claimed: false,
				message: `You have already claimed today. Come back in **${formatDuration(readyAt - now)}**.`,
			};
		}
	}

	// A gap of more than two days breaks the streak.
	const continues = account.lastDaily !== null && now - account.lastDaily.getTime() < ECONOMY_COOLDOWNS.daily * 2;
	const streak = continues ? Math.min(account.dailyStreak + 1, ECONOMY.dailyStreakCap) : 1;
	const reward = ECONOMY.dailyBase + streak * ECONOMY.dailyStreakBonus;

	await adjustWallet(guildId, userId, reward);
	await setFields(guildId, userId, { lastDaily: new Date(now), dailyStreak: streak });

	return {
		claimed: true,
		reward,
		streak,
		message: `You collected **${formatNumber(reward)}** — day **${streak}** of your streak.`,
	};
}

export function dailyReady(lastDaily: Date | null, now = Date.now()): boolean {
	return lastDaily === null || now >= lastDaily.getTime() + ECONOMY_COOLDOWNS.daily;
}

/** What using each usable item pays out. */
export const USE_OUTCOMES: Record<string, { verb: string; min: number; max: number }> = {
	fishing_rod: { verb: "You cast a line and reeled in a decent haul", min: 100, max: 900 },
	hunting_rifle: { verb: "You went hunting and came back with something worth selling", min: 250, max: 1_800 },
	bank_upgrade: { verb: "You upgraded your bank and found some forgotten change inside", min: 0, max: 0 },
};

export interface UseResult {
	used: boolean;
	message: string;
	reward?: number;
}

/** Consumes one of an item and pays out, for the Use button on each inventory row. */
export async function useItem(
	guildId: string,
	userId: string,
	itemId: string,
	roll: (min: number, max: number) => number,
): Promise<UseResult> {
	const definition = findShopItem(itemId);
	if (!definition) return { used: false, message: `There is no item with the id \`${itemId}\`.` };
	if (!definition.usable) return { used: false, message: `${definition.name} is not something you can use.` };

	// Removing first means a failed decrement cannot still pay out.
	const consumed = await removeInventoryItem(guildId, userId, itemId, 1);
	if (!consumed) return { used: false, message: `You do not own a ${definition.name}.` };

	const outcome = USE_OUTCOMES[itemId];
	const reward = outcome && outcome.max > 0 ? roll(outcome.min, outcome.max) : 0;
	if (reward > 0) await adjustWallet(guildId, userId, reward);

	return {
		used: true,
		reward,
		message:
			outcome && reward > 0
				? `${definition.emoji} ${outcome.verb} — **${formatNumber(reward)}**.`
				: `${definition.emoji} ${definition.useDescription ?? "Nothing much happened."}`,
	};
}
