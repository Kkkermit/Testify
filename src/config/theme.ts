import { type ColorResolvable } from "discord.js";
import { Category, categoryColor } from "./categories";

/**
 * Colours, emoji and branding. Everything here is cosmetic — nothing that differs
 * between deployments (IDs, secrets, channels) belongs in this file.
 */
export const theme = {
	brand: {
		name: "Testify",
		developer: "Kkermit",
		credit: "| Developed by Kkermit",
		repository: "https://github.com/Kkkermit/Testify",
		supportInvite: "https://discord.gg/xcMVwAVjSD",
	},

	colors: {
		default: "Blurple",
		error: "Red",
		success: "Green",
		warning: "Yellow",
		info: "LuminousVividPink",
		audit: "Purple",
		verify: "DarkGreen",
		spotify: "#1db954",
		instagram: "LuminousVividPink",
		valorant: "#fd4556",
		automod: "Blue",
	} satisfies Record<string, ColorResolvable>,

	/**
	 * Unicode only. Custom emoji render as raw text in guilds that do not have them,
	 * which is exactly what the previous ~30 hardcoded emoji IDs did for self-hosters.
	 */
	emoji: {
		arrow: "⤵",
		error: "❌",
		success: "☑️",
		warning: "⚠️",
		info: "ℹ️",
		auditLog: "📋",
		verify: "✅",
		counting: "✔️",
		confetti: "🎉",
		coffee: "☕",
		automod: "🤖",
		moderation: "🔨",
		coin: "🪙",
		bank: "🏦",
		wallet: "👛",
		first: "⏮️",
		previous: "◀️",
		next: "▶️",
		last: "⏭️",
		close: "🗑️",
	},

	music: {
		play: "▶️",
		pause: "⏸️",
		stop: "⏹️",
		queue: "📄",
		success: "☑️",
		repeat: "🔁",
		shuffle: "🔀",
		error: "❌",
		volume: "🔊",
		skip: "⏭️",
		previous: "⏮️",
	},

	currency: {
		symbol: "🪙",
		name: "coins",
	},
} as const;

export function colorFor(category: Category): ColorResolvable {
	return categoryColor[category];
}

export const DEFAULT_CATEGORY: Category = Category.Info;
