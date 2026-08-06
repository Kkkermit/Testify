import { z } from "zod";
import { containsMarkup, MARKUP_REFUSAL } from "./markup";

/**
 * Every free-text field the API accepts goes through here: control characters and bidi overrides are stripped,
 * HTML is refused, and the length is checked last.
 *
 * Markup is refused rather than stripped because these values are re-rendered by Discord and by the ticket
 * transcripts, and a sanitiser run over them eats mentions, custom emoji and timestamps — see `markup.ts`.
 */

/** C0 and C1 controls, minus the tab and newline a multi-line template legitimately contains. */
// eslint-disable-next-line no-control-regex -- Matching control characters is the entire job of this line.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * Bidirectional overrides and invisible formatting characters. A welcome message carrying U+202E renders in a
 * different order than it reads in the box that saved it — the Trojan Source problem, in a text field.
 */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

export function sanitiseText(value: string): string {
	return value.normalize("NFC").replace(CONTROL, "").replace(INVISIBLE, "").trim();
}

/** A single-line field, where a newline would break the layout the value is written into. */
export function sanitiseLine(value: string): string {
	return sanitiseText(value).replace(/\s+/g, " ");
}

/**
 * The length is checked after the strip, not before, so a value padded out to the minimum with zero-width
 * spaces is refused rather than stored as something shorter than the form promised.
 */
export function plainText(min: number, max: number): z.ZodType<string, string> {
	return z.string().transform(sanitiseText).pipe(bounds(min, max));
}

export function plainLine(min: number, max: number): z.ZodType<string, string> {
	return z.string().transform(sanitiseLine).pipe(bounds(min, max));
}

function bounds(min: number, max: number): z.ZodType<string, string> {
	return z
		.string()
		.min(min, "cannot be empty")
		.max(max, "is too long")
		.refine((value) => !containsMarkup(value), MARKUP_REFUSAL);
}
