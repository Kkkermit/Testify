import { LOCALE_NAMES, LOCALES } from "@/i18n";
import de from "@/i18n/locales/de.json";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";

/**
 * English is the source; the other three are checked against it here.
 *
 * A missing key is invisible at runtime — i18next falls back to English and the screen still reads — so
 * nothing but a test notices a locale drifting behind. That fallback is the right behaviour and this is what
 * stops it becoming the normal state.
 */

interface Json {
	[key: string]: string | Json;
}

const DICTIONARIES: Record<string, Json> = { es, de, fr };

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
	return [...message.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "");
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
