import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { CARD_HEADING } from "@/components/primitives/textStyles";

const SRC = resolve(__dirname, "../..");

function everySource(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) everySource(path, found);
		else if (path.endsWith(".tsx") || path.endsWith(".ts")) found.push(path);
	}

	return found;
}

describe("CARD_HEADING", () => {
	/**
	 * A Tailwind size utility carries its own `line-height` and beats both `@theme` and the base layer — the
	 * same trap as the select's chevron room. Without an explicit `leading-*` here a card heading sits at 1.5,
	 * which is body spacing, and only the size tells it apart from a paragraph.
	 */
	it("sets its own line height, because the size utility would otherwise win", () => {
		expect(CARD_HEADING).toMatch(/\bleading-\w+/);
	});

	it("wears the display face, so a heading is not just larger body text", () => {
		expect(CARD_HEADING).toContain("font-display");
	});

	/** It was written out identically 28 times before it had a name. */
	it("is the only place the card heading is spelled out", () => {
		const literal = "font-display text-base";
		const offenders = everySource(SRC)
			.filter((path) => !path.endsWith("textStyles.ts") && !path.endsWith("textStyles.test.ts"))
			.filter((path) => readFileSync(path, "utf8").includes(literal));

		expect(offenders).toEqual([]);
	});
});

describe("the type scale", () => {
	const CSS = readFileSync(resolve(SRC, "index.css"), "utf8");

	/** Tailwind's default for this size is 1.43, and `text-sm` is most of the reading in the app. */
	it("loosens body copy past Tailwind's default", () => {
		const found = /--text-sm--line-height:\s*([\d.]+)/.exec(CSS);
		expect(found).not.toBeNull();
		expect(Number(found?.[1])).toBeGreaterThanOrEqual(1.5);
	});
});
