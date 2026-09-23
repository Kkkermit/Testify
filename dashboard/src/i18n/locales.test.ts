import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LOCALE_NAMES, LOCALES } from "@/i18n";
import de from "@/i18n/locales/de.json";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";
// `it` is Jest's own global, so the Italian dictionary is imported under a name that cannot shadow it.
import italian from "@/i18n/locales/it.json";
import russian from "@/i18n/locales/ru.json";

/** Every locale against English, because a missing key falls back silently at runtime. */

interface Json {
	[key: string]: string | Json;
}

const DICTIONARIES: Record<string, Json> = { de, es, fr, it: italian, ru: russian };

/** Plural suffixes are per-language by design: German has no `_many` and Spanish does. */
const PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/;

function paths(node: Json, prefix = ""): string[] {
	return Object.entries(node).flatMap(([key, value]) => {
		const path = prefix === "" ? key : `${prefix}.${key}`;
		return typeof value === "string" ? [path] : paths(value, path);
	});
}

/** A plural is one message however many forms a language spells it with, so the suffix is dropped to compare. */
function messages(node: Json): Set<string> {
	return new Set(paths(node).map((path) => path.replace(PLURAL_SUFFIX, "")));
}

const english = messages(en);

describe.each(Object.entries(DICTIONARIES))("the %s dictionary", (_name, dictionary) => {
	const translated = messages(dictionary);

	it("translates every message English defines", () => {
		expect([...english].filter((key) => !translated.has(key))).toEqual([]);
	});

	it("defines nothing English does not, so a stale key cannot linger after a rename", () => {
		expect([...translated].filter((key) => !english.has(key))).toEqual([]);
	});

	/** A copied file that was never translated is worse than an untranslated one: nothing looks wrong. */
	it("is not a verbatim copy of English", () => {
		expect(JSON.stringify(dictionary)).not.toBe(JSON.stringify(en));
	});

	it("leaves every interpolation name intact", () => {
		for (const key of paths(dictionary)) {
			const source = lookup(en, key.replace(PLURAL_SUFFIX, "_other")) ?? lookup(en, key);
			const target = lookup(dictionary, key);
			if (source === undefined || target === undefined) continue;

			expect(new Set(placeholders(target))).toEqual(new Set(placeholders(source)));
		}
	});
});

function lookup(node: Json, path: string): string | undefined {
	let current: string | Json | undefined = node;
	for (const part of path.split(".")) {
		if (current === undefined || typeof current === "string") return undefined;
		current = current[part];
	}

	return typeof current === "string" ? current : undefined;
}

function placeholders(message: string): string[] {
	// `{{count, number}}` carries a formatter after the name, and the name is the part that has to match.
	return [...message.matchAll(/\{\{\s*(\w+)[^}]*\}\}/g)].map((match) => match[1] ?? "");
}

describe("the locale list", () => {
	it("names every locale in its own language", () => {
		for (const locale of LOCALES) {
			expect(LOCALE_NAMES[locale]).toBeTruthy();
		}
	});

	it("has a dictionary for every locale it offers", () => {
		expect(LOCALES.filter((locale) => locale !== "en" && !(locale in DICTIONARIES))).toEqual([]);
	});
});

/** Every English key has to be rendered somewhere, or it is dead weight in six files. */
describe("the English dictionary", () => {
	const used = sourceText();

	it("has no key the dashboard never renders", () => {
		const dead = [...english].filter((key) => !used.includes(`"${key}"`));

		expect(dead).toEqual([]);
	});
});

/** Every module the app ships, so a key used anywhere counts as used. Tests and the locales themselves do not. */
function sourceText(): string {
	const read = (dir: string): string =>
		readdirSync(dir, { withFileTypes: true })
			.map((entry) => {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) return read(path);
				const source = /\.tsx?$/.test(path) && !path.includes(".test.") && !path.includes("locales");
				return source ? readFileSync(path, "utf8") : "";
			})
			.join("");

	return read(resolve(__dirname, ".."));
}
