import { PermissionsBitField } from "discord.js";
import { DEFAULT_PREFIX, ECONOMY, ECONOMY_COOLDOWNS, LEVELLING, TICKET } from "@config/constants";
import { formatDurationLong, formatNumber, humanisePermission } from "@lib/format/format.util";
import {
	GIVEAWAY_LIMITS,
	INVITE_PERMISSIONS,
	LEVEL_LIMITS,
	LOTTERY_LIMITS,
	SETTINGS_LIMITS,
	STICKY_LIMITS,
	TREASURE_DEFAULTS,
	TREASURE_LIMITS,
	WELCOME_LIMITS,
} from "@testify/shared";

/** Every number an article quotes, read from the code, so an article cannot state a limit the bot no longer has. */
export const FACTS: Readonly<Record<string, string>> = {
	"prefix.default": DEFAULT_PREFIX,
	"prefix.maxLength": formatNumber(SETTINGS_LIMITS.maxPrefix),
	"invite.permissions": new PermissionsBitField(BigInt(INVITE_PERMISSIONS))
		.toArray()
		.map((name) => humanisePermission(name))
		.join(", "),

	"economy.startingWallet": formatNumber(ECONOMY.startingWallet),
	"economy.dailyBase": formatNumber(ECONOMY.dailyBase),
	"economy.dailyStreakBonus": formatNumber(ECONOMY.dailyStreakBonus),
	"economy.dailyStreakCap": formatNumber(ECONOMY.dailyStreakCap),
	"economy.dailyMax": formatNumber(ECONOMY.dailyBase + ECONOMY.dailyStreakCap * ECONOMY.dailyStreakBonus),
	"economy.workMin": formatNumber(ECONOMY.workMinPay),
	"economy.workMax": formatNumber(ECONOMY.workMaxPay),
	"economy.begMax": formatNumber(ECONOMY.begMax),
	"economy.robChance": `${String(Math.round(ECONOMY.robSuccessChance * 100))}%`,
	"economy.robFine": `${String(Math.round(ECONOMY.robFinePercent * 100))}%`,
	"economy.robMinWallet": formatNumber(ECONOMY.robMinTargetWallet),
	"economy.heistMin": formatNumber(ECONOMY.heistMinPlayers),
	"economy.heistMax": formatNumber(ECONOMY.heistMaxPlayers),
	"economy.heistJoin": formatDurationLong(ECONOMY.heistJoinWindowMs),
	"economy.inventoryMax": formatNumber(ECONOMY.maxInventorySize),

	"cooldown.daily": formatDurationLong(ECONOMY_COOLDOWNS.daily),
	"cooldown.work": formatDurationLong(ECONOMY_COOLDOWNS.work),
	"cooldown.rob": formatDurationLong(ECONOMY_COOLDOWNS.rob),
	"cooldown.heist": formatDurationLong(ECONOMY_COOLDOWNS.heist),
	"cooldown.beg": formatDurationLong(ECONOMY_COOLDOWNS.beg),
	"cooldown.gamble": formatDurationLong(ECONOMY_COOLDOWNS.gamble),

	"levelling.xpMin": formatNumber(LEVELLING.xpPerMessageMin),
	"levelling.xpMax": formatNumber(LEVELLING.xpPerMessageMax),
	"levelling.xpCooldown": formatDurationLong(LEVELLING.messageCooldownMs),
	"levelling.xpForLevel1": formatNumber(LEVELLING.xpForLevel(1)),
	"levelling.xpForLevel5": formatNumber(LEVELLING.xpForLevel(5)),
	"levelling.xpForLevel10": formatNumber(LEVELLING.xpForLevel(10)),
	"levelling.maxBoosts": formatNumber(LEVEL_LIMITS.maxBoosts),
	"levelling.maxMultiplier": formatNumber(LEVEL_LIMITS.maxMultiplier),
	"levelling.maxRewards": formatNumber(LEVEL_LIMITS.maxRewards),
	"levelling.maxRewardLevel": formatNumber(LEVEL_LIMITS.maxRewardLevel),
	"levelling.maxIgnoredChannels": formatNumber(LEVEL_LIMITS.maxIgnoredChannels),
	"levelling.maxIgnoredRoles": formatNumber(LEVEL_LIMITS.maxIgnoredRoles),

	"welcome.maxMessage": formatNumber(WELCOME_LIMITS.maxMessage),
	"welcome.maxBackgroundMb": `${String(WELCOME_LIMITS.maxBackgroundBytes / (1024 * 1024))} MB`,

	"sticky.minCap": formatNumber(STICKY_LIMITS.minCap),
	"sticky.maxCap": formatNumber(STICKY_LIMITS.maxCap),
	"sticky.maxPerServer": formatNumber(STICKY_LIMITS.maxPerGuild),

	"giveaway.maxWinners": formatNumber(GIVEAWAY_LIMITS.maxWinners),
	"giveaway.minDuration": formatDurationLong(GIVEAWAY_LIMITS.minDurationMs),
	"giveaway.maxDuration": formatDurationLong(GIVEAWAY_LIMITS.maxDurationMs),

	"lottery.maxWinners": formatNumber(LOTTERY_LIMITS.maxWinners),

	"treasure.minMessages": formatNumber(TREASURE_DEFAULTS.minMessages),
	"treasure.maxMessages": formatNumber(TREASURE_DEFAULTS.maxMessages),
	"treasure.minAmount": formatNumber(TREASURE_DEFAULTS.minAmount),
	"treasure.maxAmount": formatNumber(TREASURE_DEFAULTS.maxAmount),
	"treasure.cooldown": formatDurationLong(TREASURE_DEFAULTS.cooldownMs),
	"treasure.maxAmountLimit": formatNumber(TREASURE_LIMITS.maxAmount),

	"ticket.closeDelay": formatDurationLong(TICKET.closeDelayMs),
};

const FACT = /\{fact:([a-zA-Z0-9.]+)\}/g;

export function unknownFacts(text: string): string[] {
	return [...text.matchAll(FACT)].map((match) => match[1] ?? "").filter((key) => FACTS[key] === undefined);
}

export function fillFacts(text: string): string {
	return text.replace(FACT, (whole, key: string) => FACTS[key] ?? whole);
}
