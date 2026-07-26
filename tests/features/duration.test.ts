import { parseDuration } from "../../src/features/moderation/services/duration";

describe("parseDuration", () => {
	it("parses single units", () => {
		expect(parseDuration("10s")).toBe(10_000);
		expect(parseDuration("5m")).toBe(300_000);
		expect(parseDuration("2h")).toBe(7_200_000);
		expect(parseDuration("3d")).toBe(259_200_000);
		expect(parseDuration("1w")).toBe(604_800_000);
	});

	it("parses compound durations", () => {
		expect(parseDuration("1h30m")).toBe(5_400_000);
		expect(parseDuration("1d 12h")).toBe(129_600_000);
	});

	it("accepts long unit names and mixed casing", () => {
		expect(parseDuration("2 HOURS")).toBe(7_200_000);
		expect(parseDuration("30 minutes")).toBe(1_800_000);
	});

	// The previous mute command offered a fixed choice list of raw second counts.
	it("treats a bare number as seconds", () => {
		expect(parseDuration("604800")).toBe(604_800_000);
	});

	it("rejects nonsense", () => {
		expect(parseDuration("")).toBeNull();
		expect(parseDuration("soon")).toBeNull();
		expect(parseDuration("10 parsecs")).toBeNull();
	});
});
