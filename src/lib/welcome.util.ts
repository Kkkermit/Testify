import { type WelcomeSettings, type WelcomeStyle } from "@database/models/guildSettings.schema";

/** The rules of the welcome system, with no Discord objects in sight. */

export const WELCOME_LIMITS = {
	maxMessage: 1_500,
	/** Bigger than this and the guild settings document starts to matter. */
	maxBackgroundBytes: 4 * 1024 * 1024,
} as const;

export const WELCOME_STYLES = ["text", "embed", "card"] as const;

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

export interface WelcomeConfig {
	channelId: string;
	message: string;
	style: WelcomeStyle;
	hasBackground: boolean;
}

type AddedLater = "style" | "background";
export type StoredWelcomeSettings = Omit<WelcomeSettings, AddedLater> & Partial<Pick<WelcomeSettings, AddedLater>>;

/**
 * The old `isEmbed` boolean becomes the three-way style, so a guild that turned embeds on keeps them and nothing
 * else in the codebase knows the flag existed.
 */
export function normaliseWelcome(settings: StoredWelcomeSettings | null): WelcomeConfig | null {
	if (settings === null) return null;

	return {
		channelId: settings.channelId,
		message: settings.message,
		style: settings.style ?? (settings.isEmbed ? "embed" : "text"),
		hasBackground: (settings.background?.data.byteLength ?? 0) > 0,
	};
}

export interface GreetingContext {
	mention: string;
	username: string;
	serverName: string;
	memberCount: number;
}

/** Fills the placeholders. */
export function fillTemplate(template: string, context: GreetingContext): string {
	return template
		.replaceAll("{user}", context.mention)
		.replaceAll("{username}", context.username)
		.replaceAll("{server}", context.serverName)
		.replaceAll("{count}", String(context.memberCount));
}

export interface BackgroundCheck {
	ok: boolean;
	reason?: string;
}

/** Whether an uploaded file can be used as a card background. */
export function checkBackground(file: {
	contentType: string | null;
	size: number;
	width?: number | null;
}): BackgroundCheck {
	if (!file.contentType?.startsWith("image/")) {
		return { ok: false, reason: "That is not an image. Upload a PNG, JPG or WebP." };
	}

	if (file.contentType.includes("gif")) {
		return { ok: false, reason: "Animated GIFs cannot be used — the card is a still image. Try a PNG or JPG." };
	}

	if (file.size > WELCOME_LIMITS.maxBackgroundBytes) {
		const megabytes = Math.round(WELCOME_LIMITS.maxBackgroundBytes / 1024 / 1024);
		return { ok: false, reason: `That image is too large. Keep it under ${megabytes} MB.` };
	}

	return { ok: true };
}
