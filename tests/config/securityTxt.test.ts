import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RFC 9116 requires an `Expires`, and a lapsed one makes the file invalid rather than merely stale — so it
 * needs the same treatment as `.nsprc`: a date nobody can forget, because forgetting fails the build.
 */
const FILE = resolve(__dirname, "../..", "dashboard/public/.well-known/security.txt");
const text = readFileSync(FILE, "utf8");

function field(name: string): string | undefined {
	return text
		.split("\n")
		.find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))
		?.slice(name.length + 1)
		.trim();
}

describe("security.txt", () => {
	it.each(["Contact", "Expires"])("carries the required %s field", (name) => {
		expect(field(name)).toBeTruthy();
	});

	it("points at somewhere a report can actually be sent", () => {
		expect(field("Contact")).toMatch(/^(https:\/\/|mailto:)/);
	});

	/** Renew it well before the day it lapses, rather than on the day somebody needs to report something. */
	it("does not expire within the next 30 days", () => {
		const expires = new Date(field("Expires") ?? "");
		const monthAway = Date.now() + 30 * 24 * 60 * 60 * 1000;

		expect(Number.isNaN(expires.getTime())).toBe(false);
		expect(expires.getTime()).toBeGreaterThan(monthAway);
	});

	/** The RFC caps it at a year out, so a date far in the future is not a way to avoid renewing it. */
	it("is not dated more than a year ahead", () => {
		const expires = new Date(field("Expires") ?? "").getTime();
		const yearAway = Date.now() + 366 * 24 * 60 * 60 * 1000;

		expect(expires).toBeLessThanOrEqual(yearAway);
	});
});
