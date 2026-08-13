import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * The mechanical half of §19.11's voice, checked on every run.
 *
 * Most of that section — "never blame", "say what a thing costs before it is done" — needs a reader. These
 * four do not, and they are the ones that drift silently: one American spelling in a screen nobody has looked
 * at in a month reads as a different product from the bot's own copy.
 */

const SRC = resolve(__dirname, "..");

/** Only visible copy: JSX text nodes, and the props that put a string on screen. */
const VISIBLE =
	/<[a-z][^>]*>([^<>{}\n][^<>{}]{5,})<|(?:label|hint|title|describes|body|subtitle|placeholder)="([^"]{5,})"/g;

const AMERICAN: Record<string, string> = {
	analyze: "analyse",
	authorize: "authorise",
	behavior: "behaviour",
	canceled: "cancelled",
	catalog: "catalogue",
	center: "centre",
	color: "colour",
	customize: "customise",
	favorite: "favourite",
	gray: "grey",
	license: "licence",
	organize: "organise",
	recognize: "recognise",
	summarize: "summarise",
};

function everySource(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) everySource(path, found);
		else if (path.endsWith(".tsx") && !path.includes(".test.")) found.push(path);
	}

	return found;
}

/**
 * The copy now lives in `en.json` rather than in the components, so that is where most of it is read from.
 * The `.tsx` sweep stays for anything not yet extracted — a screen half-translated must not fall out of scope.
 */
function localeLines(): { where: string; text: string }[] {
	const out: { where: string; text: string }[] = [];
	const walk = (node: unknown, path: string): void => {
		if (typeof node === "string") {
			out.push({ where: `en.json:${path}`, text: node });
			return;
		}
		if (typeof node !== "object" || node === null) return;
		for (const [key, value] of Object.entries(node)) walk(value, path === "" ? key : `${path}.${key}`);
	};
	walk(JSON.parse(readFileSync(resolve(SRC, "i18n/locales/en.json"), "utf8")), "");

	return out;
}

function copyLines(): { where: string; text: string }[] {
	const out: { where: string; text: string }[] = [...localeLines()];
	for (const path of everySource(SRC)) {
		const lines = readFileSync(path, "utf8").split("\n");
		lines.forEach((line, index) => {
			for (const match of line.matchAll(VISIBLE)) {
				const text = (match[1] ?? match[2] ?? "").trim();
				if (text !== "") out.push({ where: `${path.slice(SRC.length + 1)}:${String(index + 1)}`, text });
			}
		});
	}

	return out;
}

describe("the dashboard's voice", () => {
	const copy = copyLines();

	it("has copy to check at all, so a broken matcher cannot pass vacuously", () => {
		expect(copy.length).toBeGreaterThan(100);
	});

	/** The bot's own strings are British, and a dashboard that is not reads as a different product. */
	it("spells the British way, matching src/config/strings.ts", () => {
		const wrong = copy.flatMap(({ where, text }) =>
			Object.entries(AMERICAN)
				.filter(([american]) => new RegExp(`\\b${american}\\b`, "i").test(text))
				.map(([american, british]) => `${where}: "${american}" should be "${british}" — ${text.slice(0, 50)}`),
		);

		expect(wrong).toEqual([]);
	});

	/** Second person throughout: this is the reader's bot, not a product team's. */
	it("never speaks in the first person", () => {
		const wrong = copy
			.filter(({ text }) => /\b(we|our|ours|we're|we've)\b/i.test(text))
			.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);

		expect(wrong).toEqual([]);
	});

	it("uses a real ellipsis rather than three dots", () => {
		const wrong = copy.filter(({ text }) => text.includes("...")).map(({ where, text }) => `${where}: ${text}`);

		expect(wrong).toEqual([]);
	});

	/** A straight quote beside a curly one in the next card is exactly the drift this file exists to catch. */
	it("uses curly apostrophes in prose", () => {
		const wrong = copy
			.filter(({ text }) => /[a-z]'[a-z]/i.test(text))
			.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);

		expect(wrong).toEqual([]);
	});
});
