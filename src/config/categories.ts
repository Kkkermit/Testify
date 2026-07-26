/**
 * Command categories. Adding one here makes it available to `/help` and to the
 * `category` field on a command — nothing else needs changing.
 */
export const CATEGORIES = {
	community: { label: "Community", emoji: "👥", colour: "Green" },
	economy: { label: "Economy", emoji: "💰", colour: "DarkOrange" },
	fun: { label: "Fun", emoji: "🎮", colour: "Yellow" },
	games: { label: "Games", emoji: "🎯", colour: "Orange" },
	info: { label: "Info", emoji: "📚", colour: "Blurple" },
	levelling: { label: "Levelling", emoji: "📈", colour: "Fuchsia" },
	moderation: { label: "Moderation", emoji: "🛡️", colour: "DarkRed" },
	music: { label: "Music", emoji: "🎵", colour: "Gold" },
	settings: { label: "Settings", emoji: "⚙️", colour: "Blue" },
	tickets: { label: "Tickets", emoji: "🎫", colour: "Blurple" },
	giveaway: { label: "Giveaways", emoji: "🎁", colour: "Aqua" },
	developer: { label: "Feedback", emoji: "💬", colour: "Aqua" },
	owner: { label: "Owner", emoji: "👑", colour: "DarkGrey" },
} as const;

export type Category = keyof typeof CATEGORIES;

export const ALL_CATEGORIES = Object.keys(CATEGORIES) as Category[];

/** Hidden from `/help`. */
export const HIDDEN_CATEGORIES: Category[] = ["owner"];

export function isCategory(value: string): value is Category {
	return value in CATEGORIES;
}

export function categoryLabel(category: Category): string {
	return CATEGORIES[category].label;
}

export function categoryEmoji(category: Category): string {
	return CATEGORIES[category].emoji;
}
