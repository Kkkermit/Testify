import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Colors, resolveColor } from "discord.js";
import { ALL_CATEGORIES, CATEGORIES } from "@config/categories";
import { theme } from "@config/theme";

const SRC = resolve(__dirname, "../..", "src");

function everySourceFile(directory: string, found: string[] = []): string[] {
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) everySourceFile(path, found);
		else if (entry.endsWith(".ts")) found.push(path);
	}

	return found;
}

describe("the category palette", () => {
	/**
	 * The stripe down the side of an embed is how a reader tells a levelling reply from a moderation one. Two
	 * categories shared Blurple and two more shared Aqua, so for four of the twelve it said nothing at all.
	 */
	it("gives every category its own colour", () => {
		const byColour = new Map<number, string[]>();

		for (const category of ALL_CATEGORIES) {
			const resolved = resolveColor(CATEGORIES[category].colour);
			byColour.set(resolved, [...(byColour.get(resolved) ?? []), category]);
		}

		expect([...byColour.values()].filter((names) => names.length > 1)).toEqual([]);
	});

	it("names a colour discord.js knows", () => {
		for (const category of ALL_CATEGORIES) {
			expect(Object.keys(Colors)).toContain(CATEGORIES[category].colour);
		}
	});
});

describe("the semantic palette", () => {
	it("names a colour discord.js knows", () => {
		for (const colour of Object.values(theme.colours)) {
			expect(Object.keys(Colors)).toContain(colour);
		}
	});

	/**
	 * Ten audit handlers each wrote their own `colour: "Green"`, so the log's colour language lived in ten
	 * files and could be changed in nine of them. `theme.colours` is meant to be the only place one is written.
	 */
	it("is the only place a colour name is written", () => {
		const names = Object.keys(Colors).join("|");
		const literal = new RegExp(`colou?r:\\s*"(${names})"`);

		const offenders = everySourceFile(SRC)
			.filter((file) => !file.includes(join("src", "config")))
			.filter((file) => literal.test(readFileSync(file, "utf8")))
			.map((file) => file.slice(SRC.length + 1));

		expect(offenders).toEqual([]);
	});

	it("has files to read, so the check above cannot pass vacuously", () => {
		expect(everySourceFile(SRC).length).toBeGreaterThan(100);
	});
});
