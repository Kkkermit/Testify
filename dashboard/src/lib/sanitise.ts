import { containsMarkup, discordTokens } from "@testify/shared";
import DOMPurify from "dompurify";

/** DOMPurify over a free-text box, with Discord's own markup lifted out and put back; the API is the real boundary. */

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

/** The fragment's `textContent`, run to a fixed point, so an escaped tag can never come back live. */
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
