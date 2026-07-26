import { type ColorResolvable } from "discord.js";

export const Category = {
	Economy: "economy",
	Moderation: "moderation",
	Community: "community",
	Info: "info",
	Fun: "fun",
	Music: "music",
	Levelling: "levelling",
	MiniGames: "minigames",
	Settings: "settings",
	Tickets: "tickets",
	Giveaway: "giveaway",
	Profile: "profile",
	Integrations: "integrations",
	Owner: "owner",
	Developer: "developer",
	Help: "help",
} as const;

export type Category = (typeof Category)[keyof typeof Category];

export const ALL_CATEGORIES: readonly Category[] = Object.values(Category);

/** Categories hidden from `/help` and the public command listing. */
export const HIDDEN_CATEGORIES: readonly Category[] = [Category.Owner];

export const categoryLabel: Record<Category, string> = {
	[Category.Economy]: "Economy",
	[Category.Moderation]: "Moderation",
	[Category.Community]: "Community",
	[Category.Info]: "Info",
	[Category.Fun]: "Fun",
	[Category.Music]: "Music",
	[Category.Levelling]: "Levelling",
	[Category.MiniGames]: "Mini Games",
	[Category.Settings]: "Settings",
	[Category.Tickets]: "Tickets",
	[Category.Giveaway]: "Giveaway",
	[Category.Profile]: "Profile",
	[Category.Integrations]: "Integrations",
	[Category.Owner]: "Owner",
	[Category.Developer]: "Developer",
	[Category.Help]: "Help",
};

export const categoryEmoji: Record<Category, string> = {
	[Category.Economy]: "💰",
	[Category.Moderation]: "🛡️",
	[Category.Community]: "👥",
	[Category.Info]: "📚",
	[Category.Fun]: "🎮",
	[Category.Music]: "🎵",
	[Category.Levelling]: "📈",
	[Category.MiniGames]: "🎯",
	[Category.Settings]: "⚙️",
	[Category.Tickets]: "🎫",
	[Category.Giveaway]: "🎁",
	[Category.Profile]: "🪪",
	[Category.Integrations]: "🔌",
	[Category.Owner]: "👑",
	[Category.Developer]: "👨‍💻",
	[Category.Help]: "❓",
};

export const categoryColor: Record<Category, ColorResolvable> = {
	[Category.Economy]: "DarkOrange",
	[Category.Moderation]: "DarkRed",
	[Category.Community]: "Green",
	[Category.Info]: "LuminousVividPink",
	[Category.Fun]: "Yellow",
	[Category.Music]: "Gold",
	[Category.Levelling]: "Fuchsia",
	[Category.MiniGames]: "Orange",
	[Category.Settings]: "Blue",
	[Category.Tickets]: "Blurple",
	[Category.Giveaway]: "Aqua",
	[Category.Profile]: "Navy",
	[Category.Integrations]: "#1db954",
	[Category.Owner]: "DarkGrey",
	[Category.Developer]: "Aqua",
	[Category.Help]: "Blurple",
};

export function isCategory(value: string): value is Category {
	return (ALL_CATEGORIES as readonly string[]).includes(value);
}
