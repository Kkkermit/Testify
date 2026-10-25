import { z } from "zod";
import { snowflake } from "./schemas";

/** Holding back accounts younger than a server allows, and telling staff when joins spike. It never kicks or bans. */

export const RAID_LIMITS = {
	/** Discord's longest timeout, so a hold always lasts until the account is old enough. */
	maxAccountAgeDays: 28,
	minSpikeJoins: 3,
	maxSpikeJoins: 100,
	minSpikeMinutes: 1,
	maxSpikeMinutes: 60,
	/** A spike that goes on is reported again after this long, rather than once a join. */
	alertEveryMinutes: 10,
	/** How many of the newest joins an alert names. */
	listed: 10,
} as const;

export const DEFAULT_RAID = {
	enabled: false,
	alertChannelId: null,
	pingRoleId: null,
	minAccountAgeDays: 0,
	spikeJoins: 10,
	spikeMinutes: 1,
} as const;

export interface RaidSettings {
	enabled: boolean;
	alertChannelId: string | null;
	/** Pinged on a spike alert, and the only thing an alert ever pings. */
	pingRoleId: string | null;
	/** 0 holds nobody back. */
	minAccountAgeDays: number;
	spikeJoins: number;
	spikeMinutes: number;
}

export interface RaidOverview extends RaidSettings {
	/** False when the bot cannot post in the alert channel. */
	canSend: boolean;
	/** False when the bot lacks Moderate Members, which a hold is a timeout under. */
	canHold: boolean;
	/** False when the role is not mentionable and the bot cannot mention it anyway. */
	canPing: boolean;
}

export const raidPatch = z
	.object({
		enabled: z.boolean().optional(),
		alertChannelId: snowflake.nullable().optional(),
		pingRoleId: snowflake.nullable().optional(),
		minAccountAgeDays: z.number().int().min(0).max(RAID_LIMITS.maxAccountAgeDays).optional(),
		spikeJoins: z.number().int().min(RAID_LIMITS.minSpikeJoins).max(RAID_LIMITS.maxSpikeJoins).optional(),
		spikeMinutes: z.number().int().min(RAID_LIMITS.minSpikeMinutes).max(RAID_LIMITS.maxSpikeMinutes).optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type RaidPatch = z.infer<typeof raidPatch>;

/** Whole days, rounded down, since a snowflake's timestamp. */
export function accountAgeDays(createdAt: number, now: number): number {
	return Math.max(0, Math.floor((now - createdAt) / 86_400_000));
}
