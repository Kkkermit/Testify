import {
	averageUptime,
	barHeight,
	dayFill,
	HISTORY_FILL,
	millis,
	percent,
	serviceName,
} from "@/features/status/status.utils";

describe("percent", () => {
	it("keeps two decimals, because 99.9% and 99.99% are hours apart", () => {
		expect(percent(0.9987)).toBe("99.87%");
		expect(percent(0.5)).toBe("50.00%");
	});

	/** Rounding up would call a day with a real outage a perfect one. */
	it("never rounds a near miss up to a clean 100%", () => {
		expect(percent(0.99999)).toBe("99.99%");
		expect(percent(1)).toBe("100%");
	});

	it("stays inside the range", () => {
		expect(percent(1.2)).toBe("100%");
		expect(percent(-1)).toBe("0.00%");
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

	it("has nothing to say with no history at all", () => {
		expect(averageUptime([{ day: "2026-09-23", uptime: null }])).toBeNull();
	});
});

describe("dayFill", () => {
	it("colours a day by how much of it the bot was up", () => {
		expect(dayFill(null)).toBe("bg-muted");
		expect(dayFill(1)).toBe("bg-success");
		expect(dayFill(0.97)).toBe("bg-warning");
		expect(dayFill(0.5)).toBe("bg-destructive");
	});
});

describe("the history colours", () => {
	/** Offline is the one state the bot cannot report about itself, and it must not look like "no data". */
	it("draws offline as an outage, not as an empty slot", () => {
		expect(HISTORY_FILL.offline).toBe(HISTORY_FILL.down);
		expect(HISTORY_FILL.offline).not.toBe(HISTORY_FILL.none);
	});
});

describe("millis", () => {
	it("prints a reading, or a dash where there is none", () => {
		expect(millis(1234.4)).toBe("1,234 ms");
		expect(millis(null)).toBe("—");
	});
});

describe("serviceName", () => {
	it("names the services the bot calls, and passes anything else through", () => {
		expect(serviceName("pokeapi")).toBe("PokéAPI");
		expect(serviceName("Discord API")).toBe("Discord API");
	});
});

describe("barHeight", () => {
	it("scales to the tallest bar, with a floor so a fast reading is still visible", () => {
		expect(barHeight(100, 100)).toBe(100);
		expect(barHeight(1, 100)).toBe(8);
		expect(barHeight(null, 100)).toBe(0);
		expect(barHeight(10, 0)).toBe(0);
	});
});
