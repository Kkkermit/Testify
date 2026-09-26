import { z } from "zod";
import { snowflake } from "./schemas";

/** The self-updating statistics message a server can keep in one of its channels. */

export interface BotStatsSettings {
	/** Where the message is posted, or null while there is none. */
	channelId: string | null;
}

export const botStatsPost = z.object({ channelId: snowflake });

export type BotStatsPost = z.infer<typeof botStatsPost>;
