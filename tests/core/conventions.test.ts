import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** The file-naming rules from AGENTS.md §6, enforced rather than asked for. */
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

	it("gives every shared helper a lib suffix, apart from the barrels", () => {
		const wrong = filesIn("lib", /\.ts$/).filter(
			(file) => !/\.(util|constants|types)\.ts$/.test(file) && !file.endsWith("index.ts"),
		);
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

/**
 * `src/lib` is grouped by domain, and each domain's barrel is what everything outside it imports. A module that
 * sits loose, or that its folder's barrel forgot, is one no command can reach the way the lint rules require.
 */
describe("the src/lib layout", () => {
	const LIB = join(SRC, "lib");
	const folders = readdirSync(LIB).filter((entry) => statSync(join(LIB, entry)).isDirectory());

	it("keeps nothing loose at the top but the root barrel", () => {
		const loose = readdirSync(LIB).filter((entry) => statSync(join(LIB, entry)).isFile() && entry !== "index.ts");

		expect(loose).toEqual([]);
	});

	it("gives every domain folder a barrel", () => {
		const bare = folders.filter((folder) => !readdirSync(join(LIB, folder)).includes("index.ts"));

		expect(bare).toEqual([]);
	});

	it("re-exports every module a folder holds from its barrel", () => {
		const forgotten = folders.flatMap((folder) => {
			const barrel = readFileSync(join(LIB, folder, "index.ts"), "utf8");

			return readdirSync(join(LIB, folder))
				.filter((file) => file !== "index.ts" && file.endsWith(".ts"))
				.map((file) => file.replace(/\.ts$/, ""))
				.filter((module) => !barrel.includes(`"./${module}"`))
				.map((module) => `${folder}/${module}`);
		});

		expect(forgotten).toEqual([]);
	});

	it("names every folder in the root barrel", () => {
		const root = readFileSync(join(LIB, "index.ts"), "utf8");

		expect(folders.filter((folder) => !root.includes(`"./${folder}"`))).toEqual([]);
	});

	/** A types file that emits JavaScript is not a types file, and importing it for a type would load code. */
	it("keeps every .types.ts file free of runtime code", () => {
		const leaking = filesIn("lib", /\.types\.ts$/).filter((file) => {
			const source = readFileSync(join(SRC, file), "utf8");
			const valueImport =
				/^import \{(?![^}]*\btype\b)[^}]*\}/m.test(source) || /^import \{[^}]*,\s*(?!type\b)[A-Za-z]/m.test(source);

			return valueImport || /^export (const|let|function|class|enum)\b/m.test(source);
		});

		expect(leaking).toEqual([]);
	});

	/** Behaviour lives beside the code that owns it; a constants file that grows a function has become a module. */
	it("keeps every .constants.ts file to values", () => {
		const behaving = filesIn("lib", /\.constants\.ts$/).filter((file) =>
			/^export (async )?(function|class)\b/m.test(readFileSync(join(SRC, file), "utf8")),
		);

		expect(behaving).toEqual([]);
	});

	/** Deeper nesting is where a barrel starts re-exporting a barrel, and the two lint rules stop meaning anything. */
	it("goes one level deep and no further", () => {
		const nested = folders.filter((folder) =>
			readdirSync(join(LIB, folder)).some((entry) => statSync(join(LIB, folder, entry)).isDirectory()),
		);

		expect(nested).toEqual([]);
	});
});
