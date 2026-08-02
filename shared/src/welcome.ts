import { z } from "zod";
import { snowflake } from "./schemas";
import { plainText } from "./text";

/**
 * The rules of the welcome greeting, shared so the browser form, the API and the Discord panel all enforce the
 * same ones. A template the web accepts and the bot then truncates is the drift this prevents.
 */

export const WELCOME_LIMITS = {
	maxMessage: 1_500,
	/** Bigger than this and the guild settings document starts to matter. */
	maxBackgroundBytes: 4 * 1024 * 1024,
} as const;

export const WELCOME_STYLES = ["text", "embed", "card"] as const;

export type WelcomeStyle = (typeof WELCOME_STYLES)[number];

export function isWelcomeStyle(value: string): value is WelcomeStyle {
	return (WELCOME_STYLES as readonly string[]).includes(value);
}

/** What a greeting can say about the member who just joined. */
export const WELCOME_PLACEHOLDERS = [
	{ token: "{user}", describes: "Mentions them" },
	{ token: "{username}", describes: "Their name, unlinked" },
	{ token: "{server}", describes: "This server's name" },
	{ token: "{count}", describes: "How many members there are now" },
] as const;

export const DEFAULT_WELCOME_MESSAGE = "Welcome to **{server}**, {user}! You are member **{count}**.";

export interface GreetingContext {
	mention: string;
	username: string;
	serverName: string;
	memberCount: number;
}

/** Fills the placeholders. The dashboard's preview and the message the bot posts come from this one function. */
export function fillTemplate(template: string, context: GreetingContext): string {
	return template
		.replaceAll("{user}", context.mention)
		.replaceAll("{username}", context.username)
		.replaceAll("{server}", context.serverName)
		.replaceAll("{count}", String(context.memberCount));
}

export interface WelcomeConfigResponse {
	/** False when no greeting is configured at all, which is how the bot stores "off". */
	enabled: boolean;
	channelId: string | null;
	message: string;
	style: WelcomeStyle;
	/** The image itself is never sent — it is a Buffer in the database and megabytes on the wire. */
	hasBackground: boolean;
}

export const welcomePatchSchema = z
	.object({
		enabled: z.boolean(),
		channelId: snowflake.nullable(),
		message: plainText(1, WELCOME_LIMITS.maxMessage),
		style: z.enum(WELCOME_STYLES),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type WelcomePatch = z.infer<typeof welcomePatchSchema>;
