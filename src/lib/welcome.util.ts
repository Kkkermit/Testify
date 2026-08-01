import { type WelcomeSettings, type WelcomeStyle } from "@database/models/guildSettings.schema";
import {
	DEFAULT_WELCOME_MESSAGE,
	fillTemplate,
	type GreetingContext,
	isWelcomeStyle,
	WELCOME_LIMITS,
	WELCOME_PLACEHOLDERS,
	WELCOME_STYLES,
} from "@testify/shared";

/** The rules of the welcome system, with no Discord objects in sight. */

// Declared in `@testify/shared` so the dashboard's form validates against the same rules, and re-exported here
// because every caller in the bot already imports them from this module.
export {
	DEFAULT_WELCOME_MESSAGE,
	fillTemplate,
	type GreetingContext,
	isWelcomeStyle,
	WELCOME_LIMITS,
	WELCOME_PLACEHOLDERS,
	WELCOME_STYLES,
};

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
