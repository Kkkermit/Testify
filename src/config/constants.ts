/** Time, size and rate limits. */

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

export const ECONOMY_COOLDOWNS = {
	daily: DAY_MS,
	work: 3 * HOUR_MS,
	rob: HOUR_MS,
	heist: 3 * HOUR_MS,
	beg: 5 * MINUTE_MS,
	gamble: 10 * SECOND_MS,
} as const;

export type EconomyCooldownKey = keyof typeof ECONOMY_COOLDOWNS;

export const ECONOMY = {
	startingWallet: 500,
	startingBank: 0,
	maxInventorySize: 50,
	dailyBase: 250,
	dailyStreakBonus: 50,
	dailyStreakCap: 30,
	workMinPay: 150,
	workMaxPay: 600,
	begMin: 0,
	begMax: 120,
	robMinTargetWallet: 100,
	robSuccessChance: 0.4,
	robFinePercent: 0.15,
	heistMinPlayers: 2,
	heistMaxPlayers: 5,
	heistJoinWindowMs: 60 * SECOND_MS,
	transferMin: 1,
	passiveIncomeIntervalMs: HOUR_MS,
	leaderboardPageSize: 10,
} as const;

export const LEVELLING = {
	xpPerMessageMin: 5,
	xpPerMessageMax: 15,
	messageCooldownMs: 60 * SECOND_MS,
	/** XP required to reach `level` from zero. */
	xpForLevel: (level: number): number => level * level * 100,
} as const;

export const INTERVALS = {
	presenceRotationMs: 30 * SECOND_MS,
	lotteryCheckMs: MINUTE_MS,
	softbanCheckMs: MINUTE_MS,
	fixedStatsRefreshMs: 5 * MINUTE_MS,
	passiveIncomeMs: HOUR_MS,
} as const;

/** The prefix a server gets before anyone changes it. */
export const DEFAULT_PREFIX = "t?";

export const CACHE = {
	guildSettingsTtlMs: 5 * MINUTE_MS,
	guildSettingsMaxEntries: 5_000,
	blacklistTtlMs: MINUTE_MS,
} as const;

export const LIMITS = {
	/** Discord hard limits. */
	customIdLength: 100,
	embedDescription: 4_096,
	embedFieldValue: 1_024,
	embedTitle: 256,
	messageContent: 2_000,
	selectMenuOptions: 25,
	autocompleteChoices: 25,
	bulkDeleteMax: 100,
	bulkDeleteMin: 1,
	/** Ours. */
	defaultPageSize: 6,
	componentTimeoutMs: 5 * MINUTE_MS,
	externalApiTimeoutMs: 10 * SECOND_MS,
} as const;

export const TICKET = {
	namePrefix: "ticket-",
	closeDelayMs: 5 * SECOND_MS,
} as const;

export const TREASURE_DEFAULTS = {
	minMessages: 15,
	maxMessages: 50,
	minAmount: 10,
	maxAmount: 500,
	cooldownMs: 5 * MINUTE_MS,
} as const;

export const COUNTING_DEFAULT_MAX = 1_000_000;

/** Used where a "never expires" sentinel is needed instead of a made-up huge number. */
