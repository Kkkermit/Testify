import { parseDuration } from "@lib/duration.util";

/** Used by /mute, /softban, /giveaway — anywhere a human types "10m". */
describe("parseDuration", () => {
	it.each([
		["30s", 30_000],
		["10m", 600_000],
		["2h", 7_200_000],
		["1d", 86_400_000],
		["1w", 604_800_000],
	])("reads %s", (input, expected) => {
		expect(parseDuration(input)).toBe(expected);
	});

	it("adds up several parts", () => {
		expect(parseDuration("1h30m")).toBe(5_400_000);
		expect(parseDuration("1d 12h")).toBe(129_600_000);
	});

	it("does not care about case or spacing", () => {
		expect(parseDuration("10M")).toBe(parseDuration("10m"));
		expect(parseDuration(" 10m ")).toBe(600_000);
	});

	/** Deliberate, and surprising enough to pin: `/mute 30` means thirty seconds. */
	it("reads a bare number as seconds", () => {
		expect(parseDuration("30")).toBe(30_000);
	});

	it("returns null for something it cannot read", () => {
		for (const input of ["", "soon", "m10", "10x"]) {
			expect(parseDuration(input)).toBeNull();
		}
	});
});
