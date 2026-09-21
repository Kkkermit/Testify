import { type ColorResolvable } from "discord.js";
import { CATEGORIES, type Category } from "@config/categories";

/** Colours, emoji and branding. */
export const theme = {
	name: "Testify",
	author: "Kkermit",
	credit: "Testify",
	repository: "https://github.com/Kkkermit/Testify",
	supportServer: "https://discord.gg/xcMVwAVjSD",

	/** The only place a colour is written. Everything else names one of these. */
	colours: {
		default: "Blurple",
		error: "Red",
		success: "Green",
		warning: "Yellow",
		info: "Blue",
		audit: "DarkPurple",
		/** A moderator acted, rather than something merely changing. */
		severe: "DarkRed",
		/** Something left or ran out, which is neither a success nor a failure. */
		notice: "Orange",
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
