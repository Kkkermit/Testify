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

const nsprc = Object.entries(JSON.parse(read(".nsprc")) as Record<string, NspEntry>)
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

describe("every active advisory suppression", () => {
	it("is a real list, so a broken read cannot pass vacuously", () => {
		expect(entries.length).toBeGreaterThan(0);
		expect(policy.version).toMatch(/^v\d/);
	});

	it.each(entries)("%s says why it cannot be fixed", (_id, entry) => {
		expect(entry.notes).toMatch(/reached only through|cannot be upgraded|already the latest/i);
	});

	it.each(entries)("%s names the version that fixes it, or says there is none", (_id, entry) => {
		expect(entry.notes).toMatch(/fixed in \S+@\d|no fixed release yet/i);
	});

	/** An expiry in the past is a suppression nobody renewed, which is the blind spot this exists to prevent. */
	it.each(entries)("%s has not expired", (_id, entry) => {
		expect(entry.expiry).toBeGreaterThan(Date.now());
	});

	/** And one years away is the same blind spot with a longer fuse; with no fix to wait for, the fuse is shorter still. */
	it.each(entries)("%s expires within a year, or 90 days when there is no fix yet", (_id, entry) => {
		const days = /no fixed release yet/i.test(entry.notes) ? 90 : 366;
		expect(entry.expiry).toBeLessThan(Date.now() + days * 24 * 60 * 60 * 1000);
	});
});
