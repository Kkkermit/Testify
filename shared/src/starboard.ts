import { z } from "zod";
import { snowflake } from "./schemas";

/** Messages that collect enough ⭐ reactions are reposted to a server's highlights channel. */

export const STARBOARD_EMOJI = "⭐";

export const STARBOARD_LIMITS = {
	minThreshold: 1,
	maxThreshold: 50,
	defaultThreshold: 3,
} as const;

export interface StarboardSettings {
	enabled: boolean;
	channelId: string | null;
	/** How many ⭐ a message needs before it is reposted. */
	threshold: number;
	/** Whether the author's own ⭐ counts towards it. */
	selfStar: boolean;
	/** False when the bot cannot post in the channel, so a board that will never fill says so. */
	canSend: boolean;
	/** How many messages have reached the board. */
	posts: number;
}

export const starboardPatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
		threshold: z.number().int().min(STARBOARD_LIMITS.minThreshold).max(STARBOARD_LIMITS.maxThreshold).optional(),
		selfStar: z.boolean().optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type StarboardPatch = z.infer<typeof starboardPatch>;
