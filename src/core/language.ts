import { type PermissionsString } from "discord.js";
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from "@config/constants";
import { BOT_LANGUAGES, type BotLanguage } from "@config/languages";
import { PERMISSION_NAMES } from "@config/permissionNames";
import { REPLIES, type ReplyKey } from "@config/replies";
import { humanisePermission } from "@lib/format/format.util";

/** Which of the bot's languages a Discord locale reads in; anything it does not speak is English. */
export function languageOf(locale: string | null | undefined): BotLanguage {
	const base = (locale ?? "").split("-")[0]?.toLowerCase() ?? "";
	return (BOT_LANGUAGES as readonly string[]).includes(base) ? (base as BotLanguage) : "en";
}

/** A slash command, a button or a form carries the reader's own locale; a prefix command only its server's. */
export function readerLanguage(input: {
	locale?: string | null;
	guild?: { preferredLocale?: string } | null;
}): BotLanguage {
	return languageOf(input.locale ?? input.guild?.preferredLocale);
}

export function say(language: BotLanguage, key: ReplyKey, values: Readonly<Record<string, string>> = {}): string {
	return REPLIES[language][key].replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}

// The bot writes British English, which has no comma before "or" or "and".
function localeOf(language: BotLanguage): string {
	return language === "en" ? "en-GB" : language;
}

/** A list joined the way the language joins one, ending in its own word for "or". */
export function eitherOf(language: BotLanguage, items: readonly string[]): string {
	return new Intl.ListFormat(localeOf(language), { type: "disjunction" }).format(items);
}

export function allOf(language: BotLanguage, items: readonly string[]): string {
	return new Intl.ListFormat(localeOf(language), { type: "conjunction" }).format(items);
}

/** A permission as the reader's Discord names it; English keeps the bot's own lower-case wording. */
export function permissionName(language: BotLanguage, flag: string): string {
	// discord.js still lists the same bit under the name it had before Discord renamed it.
	const current = flag === "ManageEmojisAndStickers" ? "ManageGuildExpressions" : flag;
	if (language === "en") return humanisePermission(current);
	return PERMISSION_NAMES[language][current as PermissionsString] ?? humanisePermission(current);
}

const UNITS = [
	["day", DAY_MS],
	["hour", HOUR_MS],
	["minute", MINUTE_MS],
	["second", SECOND_MS],
] as const;

/** A wait such as a cooldown, in the reader's words: its two largest units, rounded up to a whole second. */
export function durationIn(language: BotLanguage, ms: number): string {
	let left = Math.max(1, Math.ceil(ms / SECOND_MS)) * SECOND_MS;
	const parts: string[] = [];
	for (const [unit, size] of UNITS) {
		const count = Math.floor(left / size);
		if (count === 0) continue;
		left -= count * size;
		parts.push(new Intl.NumberFormat(localeOf(language), { style: "unit", unit, unitDisplay: "long" }).format(count));
		if (parts.length === 2) break;
	}
	return new Intl.ListFormat(localeOf(language), { type: "unit", style: "long" }).format(parts);
}
