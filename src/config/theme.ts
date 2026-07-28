import { type ColorResolvable } from "discord.js";
import { CATEGORIES, type Category } from "@config/categories";

/** Colours, emoji and branding. Change these to make the bot look like yours. */
export const theme = {
	name: "Testify",
	author: "Kkermit",
	credit: "Testify",
	repository: "https://github.com/Kkkermit/Testify",
	supportServer: "https://discord.gg/xcMVwAVjSD",

	colours: {
		default: "Blurple",
		error: "Red",
		success: "Green",
		warning: "Yellow",
		info: "Blue",
		audit: "DarkPurple",
	} satisfies Record<string, ColorResolvable>,

	/**
	 * Plain Unicode only. Custom emoji show up as raw text in any server that does
	 * not have them, which is what made the old bot look broken elsewhere.
	 */
	emoji: {
		error: "❌",
		success: "✅",
		warning: "⚠️",
		info: "ℹ️",
		arrow: "➜",
		auditLog: "📋",
		coin: "🪙",
		bank: "🏦",
		wallet: "👛",
		confetti: "🎉",
		counting: "🔢",
		moderation: "🛡️",
		verify: "🔓",
		first: "⏮️",
		previous: "◀️",
		next: "▶️",
		last: "⏭️",
		tick: "✔️",
	},
} as const;

export function categoryColour(category: Category): ColorResolvable {
	return CATEGORIES[category].colour;
}
