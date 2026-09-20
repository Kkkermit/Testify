import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** The file-naming rules from CLAUDE.md §3, enforced rather than asked for. */
const SRC = resolve(__dirname, "../../src");

function filesIn(folder: string, pattern: RegExp): string[] {
	const found: string[] = [];

	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory)) {
			const path = join(directory, entry);
			if (statSync(path).isDirectory()) walk(path);
			else if (pattern.test(entry)) found.push(path.slice(SRC.length + 1));
		}
	};

	walk(join(SRC, folder));
	return found;
}

describe("file naming", () => {
	it("gives every command the .command.ts suffix", () => {
		const wrong = filesIn("commands", /\.ts$/).filter((file) => !file.endsWith(".command.ts"));
		expect(wrong).toEqual([]);
	});

	it("gives every event handler the .event.ts suffix", () => {
		const wrong = filesIn("events", /\.ts$/).filter((file) => !file.endsWith(".event.ts"));
		expect(wrong).toEqual([]);
	});

	it("gives every model the .schema.ts suffix", () => {
		const wrong = filesIn("database/models", /\.ts$/).filter((file) => !file.endsWith(".schema.ts"));
		expect(wrong).toEqual([]);
	});

	it("gives every shared helper the .util.ts suffix, apart from the barrel", () => {
		const wrong = filesIn("lib", /\.ts$/).filter((file) => !file.endsWith(".util.ts") && !file.endsWith("index.ts"));
		expect(wrong).toEqual([]);
	});

	it("leaves core, config and buttons unsuffixed", () => {
		for (const folder of ["core", "config", "buttons"]) {
			const suffixed = filesIn(folder, /\.ts$/).filter((file) => /\.(slash|event|util|schema)\.ts$/.test(file));
			expect(suffixed).toEqual([]);
		}
	});
});

describe("event grouping", () => {
	it("puts every gateway event in a named group", () => {
		const groups = readdirSync(join(SRC, "events")).filter((entry) =>
			statSync(join(SRC, "events", entry)).isDirectory(),
		);

		const expected = ["command", "create", "logging", "message", "ready"];
		const stray = groups.filter((group) => !expected.includes(group));

		// Cloud sync and editors leave ` 2` copies behind. Naming them beats an array
		// diff, because the copy is invisible in an editor sidebar sorted next to the
		// original and the loader would register its handlers as gateway events.
		if (stray.length > 0) {
			throw new Error(
				`Unexpected ${stray.length === 1 ? "directory" : "directories"} in src/events/: ${stray.join(", ")}.\n` +
					"This is almost always a duplicate left by cloud sync or an editor. Delete it.",
			);
		}

		expect(groups.sort()).toEqual(expected);
	});

	it("leaves nothing loose at the top of events/", () => {
		const loose = readdirSync(join(SRC, "events")).filter((entry) => entry.endsWith(".ts"));
		expect(loose).toEqual([]);
	});
});

/**
 * `Field.tsx` beside `field.ts` resolves to two different modules on Linux and one on macOS or Windows, so an
 * import of the component silently lands on the other file and the page dies at start-up with a missing export.
 */
describe("module names", () => {
	const ROOT = resolve(__dirname, "../..");
	const MODULE = /\.(?:[cm]?js|tsx?|jsx)$/;

	function stemsUnder(root: string): Map<string, string[]> {
		const byKey = new Map<string, string[]>();

		const walk = (directory: string): void => {
			for (const entry of readdirSync(directory)) {
				const path = join(directory, entry);
				if (statSync(path).isDirectory()) {
					walk(path);
					continue;
				}
				if (!MODULE.test(entry)) continue;

				const key = `${directory}/${entry.replace(MODULE, "")}`.toLowerCase();
				byKey.set(key, [...(byKey.get(key) ?? []), path.slice(ROOT.length + 1)]);
			}
		};

		walk(root);
		return byKey;
	}

	it.each(["src", "shared/src", "dashboard/src"])("has no two modules in %s differing only by case", (folder) => {
		const clashes = [...stemsUnder(join(ROOT, folder)).values()].filter((paths) => paths.length > 1);

		expect(clashes).toEqual([]);
	});
});

/**
 * A suite that discovers at run time whether its dependency exists can only return early from each test, and
 * an early return reports as a pass. Five database suites did exactly that: 41 tests reported green while
 * asserting nothing, and a mutation replacing an atomic `$inc` with `$set` survived every one of them.
 */
describe("a suite whose dependency is missing", () => {
	const TESTS = resolve(__dirname, "..");

	function everyTestFile(directory: string, found: string[] = []): string[] {
		for (const entry of readdirSync(directory)) {
			const path = join(directory, entry);
			if (statSync(path).isDirectory()) everyTestFile(path, found);
			else if (entry.endsWith(".test.ts")) found.push(path);
		}

		return found;
	}

	// Every pattern below appears in this file as a string, so the checker cannot be its own subject.
	const suites = everyTestFile(TESTS).filter((file) => file !== __filename);

	it("has files to read, so this cannot pass vacuously", () => {
		expect(suites.length).toBeGreaterThan(50);
	});

	it.each(["if (!mongoAvailable()) return", "if (!available) return", "if (!connected) return"])(
		"reports as skipped rather than passed — no test bails out with `%s`",
		(pattern) => {
			const offenders = suites
				.filter((file) => readFileSync(file, "utf8").includes(pattern))
				.map((file) => file.slice(TESTS.length + 1));

			expect(offenders).toEqual([]);
		},
	);
});
