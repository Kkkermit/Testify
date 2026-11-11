import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

/** Every suppression carries a reason, a fixing version or a short fuse without one, and an expiry that has not lapsed. */
interface Suppression {
	notes: string;
	expiry: number;
}

interface NspEntry {
	active?: boolean;
	notes?: string;
	expiry?: number;
}

type SnykRule = Record<string, { reason?: string; expires?: string }>;

const read = (file: string): string => readFileSync(resolve(__dirname, "../..", file), "utf8");

const raw = JSON.parse(read(".nsprc")) as Record<string, NspEntry>;

const nsprc = Object.entries(raw)
	.filter(([id, entry]) => entry.active === true && !id.startsWith("//"))
	.map(([id, entry]): [string, Suppression] => [
		`.nsprc ${id}`,
		{ notes: entry.notes ?? "", expiry: entry.expiry ?? 0 },
	]);

const policy = parse(read(".snyk")) as { version?: string; ignore?: Record<string, SnykRule[]> };

// A Snyk ignore is a list of paths per id, each with its own reason and expiry, so each path is held to the rules.
const snyk = Object.entries(policy.ignore ?? {}).flatMap(([id, rules]) =>
	rules.flatMap((rule) =>
		Object.entries(rule).map(([path, entry]): [string, Suppression] => [
			`.snyk ${id} (${path})`,
			{ notes: entry.reason ?? "", expiry: entry.expires ? Date.parse(entry.expires) : 0 },
		]),
	),
);

const entries = [...nsprc, ...snyk];

/** The ids of every suppression a rule fails, so one test names each entry that breaks it. */
const breaking = (keeps: (entry: Suppression) => boolean): string[] =>
	entries.filter(([, entry]) => !keeps(entry)).map(([id]) => id);

describe("every active advisory suppression", () => {
	/** There may be no suppressions at all, so the template is what proves both files were read and filtered. */
	it("is read from both files, so a broken read cannot pass vacuously", () => {
		expect(raw["//example"]?.active).toBe(false);
		expect(policy.version).toMatch(/^v\d/);
		expect(policy.ignore).toBeInstanceOf(Object);
	});

	it("says why it cannot be fixed", () => {
		expect(
			breaking((entry) => /reached only through|cannot be upgraded|already the latest/i.test(entry.notes)),
		).toEqual([]);
	});

	it("names the version that fixes it, or says there is none", () => {
		expect(breaking((entry) => /fixed in \S+@\d|no fixed release yet/i.test(entry.notes))).toEqual([]);
	});

	/** An expiry in the past is a suppression nobody renewed, which is the blind spot this exists to prevent. */
	it("has not expired", () => {
		expect(breaking((entry) => entry.expiry > Date.now())).toEqual([]);
	});

	/** A year away is the same blind spot with a longer fuse; with no fix to wait for, the fuse is shorter still. */
	it("expires within a year, or 90 days when there is no fix yet", () => {
		const within = (entry: Suppression): boolean => {
			const days = /no fixed release yet/i.test(entry.notes) ? 90 : 366;
			return entry.expiry < Date.now() + days * 24 * 60 * 60 * 1000;
		};
		expect(breaking(within)).toEqual([]);
	});
});
