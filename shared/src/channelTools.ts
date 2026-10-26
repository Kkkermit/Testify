import { z } from "zod";
import { WARNING_LIMITS } from "./memberDetail";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/** Locking a channel and setting its slowmode, from Discord or the dashboard. */

export const CHANNEL_TOOL_LIMITS = {
	/** Discord's own ceiling: six hours between messages. */
	maxSlowmodeSeconds: 21_600,
} as const;

/** The lengths Discord's own channel settings offer. */
export const SLOWMODE_SECONDS = [0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1_800, 3_600, 7_200, 21_600] as const;

export interface ToolChannel {
	id: string;
	name: string;
	category: string | null;
	/** True while `@everyone` is refused Send Messages here. */
	locked: boolean;
	slowmodeSeconds: number;
	/** False when the reader lacks Manage Channels in it, or the bot cannot change it. */
	canLock: boolean;
	canSlow: boolean;
}

export interface ChannelToolList {
	channels: ToolChannel[];
}

export const channelToolParams = z.object({ guildId: snowflake, channelId: snowflake });

export const channelToolPatch = z
	.object({
		locked: z.boolean().optional(),
		slowmodeSeconds: z.number().int().min(0).max(CHANNEL_TOOL_LIMITS.maxSlowmodeSeconds).optional(),
		reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason).optional(),
	})
	.refine((patch) => patch.locked !== undefined || patch.slowmodeSeconds !== undefined, "nothing to change");

export type ChannelToolPatch = z.infer<typeof channelToolPatch>;
