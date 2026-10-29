import { hackData, hackFields } from "@lib/games/hackReport.util";

const first = (): number => 0;

describe("the hack report data", () => {
	/** It once printed real-looking UK addresses with real postcode areas, which could name somebody's house. */
	it("holds no UK postcode", () => {
		const text = JSON.stringify(hackData());

		expect(text).not.toMatch(/\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/);
	});

	/** A literal backslash-n once reached Discord as two characters rather than a line break. */
	it("holds no escaped line break", () => {
		expect(JSON.stringify(hackData())).not.toContain("\\\\n");
	});
});

describe("hackFields", () => {
	it("fits every field inside Discord's 1,024-character limit", () => {
		for (const field of hackFields("a".repeat(32), hackData(), first)) {
			expect(field.value.length).toBeLessThanOrEqual(1_024);
		}
	});
});
