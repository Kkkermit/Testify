import { LEVELLING } from "@config/constants";
import { type LevelReward, type LevelSettings, type XpBoost } from "@database/models/guildSettings.schema";

/**
 * The rules of the levelling system, with no database or Discord objects in sight, so every decision it makes is
 * unit-testable.
 */

export const LEVEL_LIMITS = {
	maxBoosts: 5,
	maxRewards: 10,
	maxIgnoredChannels: 10,
	maxIgnoredRoles: 5,
	minMultiplier: 1,
	maxMultiplier: 5,
	maxRewardLevel: 500,
} as const;

/** Level settings with every optional field resolved. */
export interface LevelConfig {
	enabled: boolean;
	boosts: XpBoost[];
	rewards: LevelReward[];
	stackRewards: boolean;
	/** `null` means "reply wherever the message was sent". */
	levelUpChannelId: string | null;
	announce: boolean;
	ignoredChannelIds: string[];
	ignoredRoleIds: string[];
}

/** What a guild gets before anyone configures anything. */
export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
	enabled: false,
	boosts: [],
	rewards: [],
	stackRewards: true,
	levelUpChannelId: null,
	announce: true,
	ignoredChannelIds: [],
	ignoredRoleIds: [],
};

/** A null covers that now. */
const CURRENT_CHANNEL = "current";

type AddedLater = "boosts" | "rewards" | "stackRewards" | "announce" | "ignoredChannelIds" | "ignoredRoleIds";

/** What a stored document can actually look like, as opposed to what the schema declares. */
export type StoredLevelSettings = Omit<LevelSettings, AddedLater> & Partial<Pick<LevelSettings, AddedLater>>;

export function normaliseSettings(settings: StoredLevelSettings | null): LevelConfig {
	if (settings === null) return { ...DEFAULT_LEVEL_CONFIG };

	const stored = settings.boosts ?? [];
	const legacy: XpBoost[] =
		stored.length === 0 && settings.roleId !== null && settings.multiplier > 1
			? [{ roleId: settings.roleId, multiplier: settings.multiplier }]
			: [];

	return {
		enabled: !settings.isDisabled,
		boosts: [...stored, ...legacy].map((boost) => ({
			roleId: boost.roleId,
			multiplier: clampMultiplier(boost.multiplier),
		})),
		rewards: sortRewards(settings.rewards ?? []),
		stackRewards: settings.stackRewards ?? true,
		levelUpChannelId: settings.levelUpChannelId === CURRENT_CHANNEL ? null : settings.levelUpChannelId,
		announce: settings.announce ?? true,
		ignoredChannelIds: settings.ignoredChannelIds ?? [],
		ignoredRoleIds: settings.ignoredRoleIds ?? [],
	};
}

export function clampMultiplier(multiplier: number): number {
	if (!Number.isFinite(multiplier)) return LEVEL_LIMITS.minMultiplier;
	return Math.min(LEVEL_LIMITS.maxMultiplier, Math.max(LEVEL_LIMITS.minMultiplier, Math.round(multiplier)));
}

export function sortRewards(rewards: LevelReward[]): LevelReward[] {
	return [...rewards].sort((a, b) => a.level - b.level);
}

/**
 * The best multiplier the member qualifies for, rather than the product of all of them: three stacked ×5 roles would
 * be ×125, which nobody configuring "×5 for boosters" is asking for.
 */
export function multiplierFor(config: LevelConfig, roleIds: readonly string[]): number {
	const held = config.boosts.filter((boost) => roleIds.includes(boost.roleId));
	if (held.length === 0) return 1;

	return Math.max(...held.map((boost) => clampMultiplier(boost.multiplier)));
}

/** Whether a message in this channel, from a member with these roles, earns XP. */
export function earnsXp(config: LevelConfig, channelId: string, roleIds: readonly string[]): boolean {
	if (!config.enabled) return false;
	if (config.ignoredChannelIds.includes(channelId)) return false;

	return !roleIds.some((roleId) => config.ignoredRoleIds.includes(roleId));
}

export interface RewardChange {
	add: string[];
	remove: string[];
}

/** Which reward roles a member at `level` should hold, and which they should lose. */
export function rewardChangeFor(config: LevelConfig, level: number, held: readonly string[]): RewardChange {
	const earned = config.rewards.filter((reward) => reward.level <= level);
	if (earned.length === 0) return { add: [], remove: [] };

	const highest = Math.max(...earned.map((reward) => reward.level));
	const keep = config.stackRewards
		? earned.map((reward) => reward.roleId)
		: earned.filter((reward) => reward.level === highest).map((reward) => reward.roleId);

	const superseded = config.stackRewards
		? []
		: earned.filter((reward) => reward.level !== highest).map((reward) => reward.roleId);

	return {
		add: unique(keep.filter((roleId) => !held.includes(roleId))),
		remove: unique(superseded.filter((roleId) => held.includes(roleId) && !keep.includes(roleId))),
	};
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

export interface LevelProgress {
	level: number;
	xp: number;
	/** XP earned since reaching the current level. */
	progress: number;
	/** XP the current level costs, from its floor to the next one. */
	needed: number;
	/** 0 to 1, for drawing a bar. */
	fraction: number;
}

export function progressOf(xp: number, level: number): LevelProgress {
	const floor = LEVELLING.xpForLevel(level);
	const ceiling = LEVELLING.xpForLevel(level + 1);
	const needed = Math.max(1, ceiling - floor);
	const progress = Math.max(0, Math.min(needed, xp - floor));

	return { level, xp, progress, needed, fraction: progress / needed };
}

/**
 * Adding a boost role that is already boosting replaces its multiplier rather than adding a second entry, so the
 * list cannot end up with two answers for one role.
 */
export function withBoost(boosts: XpBoost[], roleId: string, multiplier: number): XpBoost[] {
	const without = boosts.filter((boost) => boost.roleId !== roleId);
	if (without.length >= LEVEL_LIMITS.maxBoosts) return boosts;

	return [...without, { roleId, multiplier: clampMultiplier(multiplier) }];
}

/** Steps a multiplier round the 1–5 range, for a button that cycles rather than a modal. */
export function nextMultiplier(multiplier: number): number {
	const next = clampMultiplier(multiplier) + 1;
	return next > LEVEL_LIMITS.maxMultiplier ? LEVEL_LIMITS.minMultiplier : next;
}

/** One role per level: setting a level that already has a reward replaces it. */
export function withReward(rewards: LevelReward[], level: number, roleId: string): LevelReward[] {
	const without = rewards.filter((reward) => reward.level !== level);
	if (without.length >= LEVEL_LIMITS.maxRewards) return rewards;

	return sortRewards([...without, { level, roleId }]);
}
