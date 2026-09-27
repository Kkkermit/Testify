import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Every suppression carries a reason, a fixing version and an expiry that has not lapsed. */
interface Suppression {
	active?: boolean;
	notes?: string;
	expiry?: number;
}

const entries = Object.entries(
	JSON.parse(readFileSync(resolve(__dirname, "../..", ".nsprc"), "utf8")) as Record<string, Suppression>,
).filter(([id, entry]) => entry.active === true && !id.startsWith("//"));

describe("every active advisory suppression", () => {
	it("is a real list, so a broken read cannot pass vacuously", () => {
		expect(entries.length).toBeGreaterThan(0);
	});

	it.each(entries)("%s says why it cannot be fixed", (_id, entry) => {
		expect(entry.notes ?? "").toMatch(/reached only through|cannot be upgraded|already the latest/i);
	});

	it.each(entries)("%s names the version that fixes it", (_id, entry) => {
		expect(entry.notes ?? "").toMatch(/fixed in \S+@\d/i);
	});

	/** An expiry in the past is a suppression nobody renewed, which is the blind spot this exists to prevent. */
	it.each(entries)("%s has not expired", (_id, entry) => {
		expect(entry.expiry ?? 0).toBeGreaterThan(Date.now());
	});

	/** And one years away is the same blind spot with a longer fuse. */
	it.each(entries)("%s expires within a year", (_id, entry) => {
		expect(entry.expiry ?? 0).toBeLessThan(Date.now() + 366 * 24 * 60 * 60 * 1000);
	});
});
