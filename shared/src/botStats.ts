import { z } from "zod";
import { snowflake } from "./schemas";

export interface BotStatsSettings {
	channelId: string | null;
}

export const botStatsPost = z.object({ channelId: snowflake });

export type BotStatsPost = z.infer<typeof botStatsPost>;
