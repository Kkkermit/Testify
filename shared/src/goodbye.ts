import { z } from "zod";
import { snowflake } from "./schemas";
import { plainText } from "./text";
import { WELCOME_LIMITS } from "./welcome";

/** The message posted when somebody leaves. It takes the greeting's placeholders, and it never pings anybody. */

export const GOODBYE_STYLES = ["text", "embed"] as const;

export type GoodbyeStyle = (typeof GOODBYE_STYLES)[number];

export const DEFAULT_GOODBYE_MESSAGE = "**{username}** has left **{server}**. There are **{count}** of us now.";

export interface GoodbyeSettings {
	enabled: boolean;
	channelId: string | null;
	message: string;
	style: GoodbyeStyle;
	/** False when the bot cannot post in the channel, so a goodbye that will never arrive says so. */
	canSend: boolean;
}

export const goodbyePatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
		message: plainText(1, WELCOME_LIMITS.maxMessage).optional(),
		style: z.enum(GOODBYE_STYLES).optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type GoodbyePatch = z.infer<typeof goodbyePatch>;
