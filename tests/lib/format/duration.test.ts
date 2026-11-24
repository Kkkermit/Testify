import { parseDuration } from "@lib/format/duration.util";

/** Used by /mute, /softban, /giveaway — anywhere a human types "10m". */
describe("parseDuration", () => {
	/** A bare number is deliberate, and surprising enough to pin: `/mute 30` means thirty seconds. */
	it("reads every unit, and a bare number as seconds", () => {
		const rows: [string, number][] = [
			["30s", 30_000],
			["10m", 600_000],
			["2h", 7_200_000],
			["1d", 86_400_000],
			["1w", 604_800_000],
			["30", 30_000],
		];

		expect(rows.filter(([input, expected]) => parseDuration(input) !== expected).map(([input]) => input)).toEqual([]);
	});

	it("returns null for something it cannot read", () => {
		for (const input of ["", "soon", "m10", "10x"]) {
			expect(parseDuration(input)).toBeNull();
		}
	});

	/** Reading time grows with the square of the length, so a pasted wall of digits took eleven seconds. */
	it("refuses a length longer than any real one without reading it", () => {
		const started = performance.now();

		expect(parseDuration("1m ".repeat(40))).toBeNull();
		expect(parseDuration(`${"0".repeat(100_000)}\t0A`)).toBeNull();
		expect(performance.now() - started).toBeLessThan(500);
		expect(parseDuration("1w 6d 23h 59m 59s")).toBe(1_209_599_000);
	});
});
