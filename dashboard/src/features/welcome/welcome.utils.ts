import { WELCOME_LIMITS, WELCOME_STYLES, type WelcomeStyle } from "@testify/shared";

export const STYLE_LABELS: Record<WelcomeStyle, { label: string; describes: string }> = {
	text: { label: "Plain text", describes: "A normal message in the channel." },
	embed: { label: "Embed", describes: "A coloured panel, easier to spot in a busy channel." },
	card: { label: "Image card", describes: "A drawn card with their avatar, plus the message." },
};

export const STYLE_ORDER = WELCOME_STYLES;

/** Inserts at the caret when there is one, and appends otherwise, which is what a blurred textarea reports. */
export function insertToken(message: string, token: string, caret: number | null): string {
	if (caret === null || caret < 0 || caret > message.length) return `${message}${token}`;
	return `${message.slice(0, caret)}${token}${message.slice(caret)}`;
}

export function messageTooLong(message: string): boolean {
	return message.length > WELCOME_LIMITS.maxMessage;
}
