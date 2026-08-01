import { z } from "zod";
import { snowflake } from "./schemas";

/**
 * The guild settings that are only ever configuration — a prefix, a filter, a list of roles. Each is a small
 * independent decision, so each has its own endpoint and each writes on change.
 */

export const SETTINGS_LIMITS = {
	/** Long enough for `!!` or `testify ` and short enough that it cannot swallow a sentence. */
	maxPrefix: 8,
	maxAutoRoles: 10,
	maxCount: 1_000_000,
} as const;

export const BYPASS_PERMISSIONS = ["ManageMessages", "ManageGuild", "ModerateMembers", "Administrator"] as const;

export type BypassPermission = (typeof BYPASS_PERMISSIONS)[number];

export const DEFAULT_BYPASS: BypassPermission = "ManageMessages";

export function isBypassPermission(value: string): value is BypassPermission {
	return (BYPASS_PERMISSIONS as readonly string[]).includes(value);
}

/** What each bypass permission means to somebody choosing one, rather than its flag name. */
export const BYPASS_LABELS: Record<BypassPermission, string> = {
	ManageMessages: "Manage Messages — most moderators",
	ManageGuild: "Manage Server — admins and above",
	ModerateMembers: "Timeout Members — trusted moderators",
	Administrator: "Administrator — owners only",
};

export interface PrefixSetting {
	prefix: string;
	/** False turns off the whole prefix surface; the slash commands are unaffected. */
	enabled: boolean;
}

export interface AntiLinkSetting {
	enabled: boolean;
	bypassPermission: BypassPermission;
}

export interface AutoRoleSetting {
	roleIds: string[];
}

export interface CountingSetting {
	enabled: boolean;
	channelId: string | null;
	maxCount: number;
	/** Where the server has got to, which is the one number here nobody types. */
	count: number;
}

export interface VoiceStatsSetting {
	memberChannelId: string | null;
	botChannelId: string | null;
}

export interface ServerSettings {
	prefix: PrefixSetting;
	antiLink: AntiLinkSetting;
	autoRoles: AutoRoleSetting;
	counting: CountingSetting;
	voiceStats: VoiceStatsSetting;
}

/** A prefix of pure whitespace matches every message; one with a space inside can never be typed. */
export const prefixPatch = z
	.object({
		prefix: z
			.string()
			.trim()
			.min(1, "cannot be empty")
			.max(SETTINGS_LIMITS.maxPrefix, "is too long")
			.refine((value) => !/\s/.test(value), "cannot contain a space"),
		enabled: z.boolean(),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type PrefixPatch = z.infer<typeof prefixPatch>;

export const antiLinkPatch = z
	.object({ enabled: z.boolean(), bypassPermission: z.enum(BYPASS_PERMISSIONS) })
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type AntiLinkPatch = z.infer<typeof antiLinkPatch>;

/** The whole list, because the control is a checklist whose value *is* the list. */
export const autoRolePut = z.object({
	roleIds: z.array(snowflake).max(SETTINGS_LIMITS.maxAutoRoles, "is too many roles"),
});

export type AutoRolePut = z.infer<typeof autoRolePut>;

export const countingPatch = z
	.object({
		enabled: z.boolean(),
		channelId: snowflake.nullable(),
		maxCount: z.number().int().min(1).max(SETTINGS_LIMITS.maxCount),
		/** Puts the count back to zero without touching anything else. */
		reset: z.literal(true),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type CountingPatch = z.infer<typeof countingPatch>;

export const voiceStatsPatch = z
	.object({ memberChannelId: snowflake.nullable(), botChannelId: snowflake.nullable() })
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type VoiceStatsPatch = z.infer<typeof voiceStatsPatch>;
