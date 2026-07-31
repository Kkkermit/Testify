import { type ColorResolvable } from "discord.js";
import { CATEGORIES, type Category } from "@config/categories";

/** Colours, emoji and branding. */
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

	/** Plain Unicode only. */
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
