import { containsMarkup, discordTokens } from "@testify/shared";
import DOMPurify from "dompurify";

/**
 * DOMPurify over a free-text box, run on the value before it is sent.
 *
 * Discord's own syntax is lifted out first and put back after: `<a:name:id>` parses as an anchor, `<t:…>` as an
 * unknown tag and `<@id>` comes back entity-encoded, so a sanitiser run over a raw message eats custom emoji,
 * timestamps and mentions alike. Measured against `dompurify`, not assumed — `sanitise.test.ts` pins each form.
 *
 * This is a convenience, not the boundary. The API refuses the same values through `plainText` / `plainLine`,
 * so a request that never touches this page is refused just the same.
 */

/** Private-use characters, so a placeholder cannot collide with anything a person can type. */
const OPEN = "\ue000";
const CLOSE = "\ue001";

export function sanitiseInput(value: string): string {
	const tokens: string[] = [];
	const held = value.replace(discordTokens(), (token) => {
		tokens.push(token);
		return `${OPEN}${String(tokens.length - 1)}${CLOSE}`;
	});

	return strip(held).replace(
		new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g"),
		(_match, index: string) => tokens[Number(index)] ?? "",
	);
}

/**
 * The fragment's `textContent`, not DOMPurify's HTML string: the string form escapes the `<` and `&` it read as
 * text, and hand-decoding those turns a typed `&lt;script&gt;` into a live tag — which is what the test named
 * for it caught. `textContent` is decoded exactly once by the parser and cannot carry markup.
 *
 * Run to a fixed point, because one pass over `&lt;script&gt;` yields the tag as text and a second removes it.
 */
function strip(value: string): string {
	let current = value;

	for (let pass = 0; pass < 3; pass += 1) {
		const fragment = DOMPurify.sanitize(current, {
			ALLOWED_TAGS: [],
			ALLOWED_ATTR: [],
			KEEP_CONTENT: true,
			RETURN_DOM_FRAGMENT: true,
		});
		const next = fragment.textContent;
		if (next === current) return current;
		current = next;
	}

	return current;
}

/** Shown under a box whose value the API would refuse, so nobody presses Save and gets a 400 instead. */
export function markupWarning(value: string): string | null {
	return containsMarkup(value) ? "HTML is not allowed here. It will be removed when this is saved." : null;
}
