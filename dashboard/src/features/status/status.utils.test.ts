import { averageUptime, HISTORY_FILL, percent } from "@/features/status/status.utils";

describe("percent", () => {
	/** Rounding up would call a day with a real outage a perfect one. */
	it("never rounds a near miss up to a clean 100%", () => {
		expect(percent(0.99999)).toBe("99.99%");
		expect(percent(1)).toBe("100%");
	});
});

describe("averageUptime", () => {
	/** A bot installed yesterday has one day of history, not twenty-nine days of outage. */
	it("leaves out days before the first heartbeat", () => {
		expect(
			averageUptime([
				{ day: "2026-09-21", uptime: null },
				{ day: "2026-09-22", uptime: 1 },
				{ day: "2026-09-23", uptime: 0.5 },
			]),
		).toBe(0.75);
	});
});

describe("the history colours", () => {
	/** Offline is the one state the bot cannot report about itself, and it must not look like "no data". */
	it("draws offline as an outage, not as an empty slot", () => {
		expect(HISTORY_FILL.offline).toBe(HISTORY_FILL.down);
		expect(HISTORY_FILL.offline).not.toBe(HISTORY_FILL.none);
	});
});
