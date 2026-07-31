import { z } from "zod";
import { snowflake } from "./schemas";

/**
 * The limits both surfaces enforce. They live here rather than in `src/lib/` so the browser form and the API
 * validate against the same numbers — two sources of truth for "how many boost roles" is how the web UI ends up
 * accepting a sixth that the Discord panel then cannot render.
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

export const xpBoostSchema = z.object({
	roleId: snowflake,
	multiplier: z.coerce.number().int().min(LEVEL_LIMITS.minMultiplier).max(LEVEL_LIMITS.maxMultiplier),
});

export const levelRewardSchema = z.object({
	level: z.coerce.number().int().min(1).max(LEVEL_LIMITS.maxRewardLevel),
	roleId: snowflake,
});

export type XpBoostInput = z.infer<typeof xpBoostSchema>;
export type LevelRewardInput = z.infer<typeof levelRewardSchema>;

/** Every field optional: a toggle sends the one thing it changed, not the whole config. */
export const levellingPatchSchema = z
	.object({
		enabled: z.boolean(),
		announce: z.boolean(),
		stackRewards: z.boolean(),
		levelUpChannelId: snowflake.nullable(),
	})
	.partial();

export type LevellingPatch = z.infer<typeof levellingPatchSchema>;

/**
 * Whole lists rather than add/remove endpoints, because the control is a multi-select whose value *is* the list.
 * One request, and no add-then-remove race between two open tabs.
 */
export const boostsSchema = z
	.array(xpBoostSchema)
	.max(LEVEL_LIMITS.maxBoosts, `at most ${String(LEVEL_LIMITS.maxBoosts)} boost roles`)
	.refine((boosts) => new Set(boosts.map((boost) => boost.roleId)).size === boosts.length, "one entry per role");

export const rewardsSchema = z
	.array(levelRewardSchema)
	.max(LEVEL_LIMITS.maxRewards, `at most ${String(LEVEL_LIMITS.maxRewards)} rewards`)
	.refine((rewards) => new Set(rewards.map((reward) => reward.level)).size === rewards.length, "one reward per level");

export const ignoresSchema = z.object({
	channelIds: z.array(snowflake).max(LEVEL_LIMITS.maxIgnoredChannels),
	roleIds: z.array(snowflake).max(LEVEL_LIMITS.maxIgnoredRoles),
});

export type Ignores = z.infer<typeof ignoresSchema>;

/** What `GET /levelling` answers with: `normaliseSettings` output, every optional field already resolved. */
export interface LevelConfigResponse {
	enabled: boolean;
	boosts: XpBoostInput[];
	rewards: LevelRewardInput[];
	stackRewards: boolean;
	levelUpChannelId: string | null;
	announce: boolean;
	ignoredChannelIds: string[];
	ignoredRoleIds: string[];
}
