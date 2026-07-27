import { readFileSync } from "node:fs";
import { z } from "zod";
import { jsonPath } from "@core/paths";

/**
 * Replaces the thirteen hand-rolled profanity checks the audit found, each with
 * its own matching rules. Tokenises and normalises once, then does set lookups —
 * the old approach re-scanned the raw word list with `Array.includes` on every
 * call and missed casing and punctuation variants.
 */

const filterFileSchema = z.object({ words: z.array(z.string()) });

const LEET_MAP: Record<string, string> = {
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	$: "s",
	"!": "i",
	"+": "t",
};

function normalise(word: string): string {
	return word
		.toLowerCase()
		.split("")
		.map((char) => LEET_MAP[char] ?? char)
		.join("")
		.replace(/[^a-z]/g, "");
}

let blocked: Set<string> | undefined;

function words(): Set<string> {
	if (blocked) return blocked;
	const raw: unknown = JSON.parse(readFileSync(jsonPath("filter.json"), "utf8"));
	const parsed = filterFileSchema.parse(raw);
	blocked = new Set(parsed.words.map(normalise).filter((word) => word.length > 2));
	return blocked;
}

function tokenise(text: string): string[] {
	return text
		.split(/[\s.,!?;:"'()[\]{}<>/\\|@#*_~`-]+/)
		.map(normalise)
		.filter(Boolean);
}

export function containsProfanity(text: string): boolean {
	const list = words();
	return tokenise(text).some((token) => list.has(token));
}

export function findProfanity(text: string): string[] {
	const list = words();
	return [...new Set(tokenise(text).filter((token) => list.has(token)))];
}

export function censor(text: string, replacement = "\\*"): string {
	const list = words();
	return text.replace(/[\p{L}\p{N}@$!+*]+/gu, (match) =>
		list.has(normalise(match)) ? replacement.repeat(match.length) : match,
	);
}

/** Test seam — forces the word list to be re-read on the next call. */
export function resetContentFilter(): void {
	blocked = undefined;
}
