import { HACK_STAGES, type HackData, hackData, hackFields, hackProgress } from "@lib/games/hackReport.util";

const DATA: HackData = {
	passwords: ["{name}845!!", "hunter2"],
	ipAddresses: ["127.0.0.1"],
	wifi: [{ name: "FBI Van", password: "notthefbi" }],
	addresses: ["742 Evergreen Terrace, Springfield"],
	birthdays: ["30 February 2005"],
	cards: [{ number: "0000 0000 0000 0000", expiry: "13/99", cvv: "abc" }],
	searches: ["can you download more ram"],
};

const first = (): number => 0;

describe("the hack report data", () => {
	it("loads and validates the real file", () => {
		const data = hackData();

		expect(data.passwords.length).toBeGreaterThan(0);
		expect(data.cards.length).toBeGreaterThan(0);
	});

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
	it("puts the target's name into a password template", () => {
		const fields = hackFields("kermit", DATA, first);

		expect(fields.find((field) => field.name === "Password")?.value).toBe("`kermit845!!`");
	});

	it("uses every roll it is given, so the report varies", () => {
		const fields = hackFields("kermit", DATA, (max) => max - 1);

		expect(fields.find((field) => field.name === "Password")?.value).toBe("`hunter2`");
		expect(fields.find((field) => field.name === "Email")?.value).toBe("`kermit99@example.com`");
	});

	it("names each card part once, rather than repeating the label inside the value", () => {
		const card = hackFields("kermit", DATA, first).find((field) => field.name === "Card");

		expect(card?.value).toBe("`0000 0000 0000 0000` · expires 13/99 · CVV abc");
	});

	it("fits every field inside Discord's 1,024-character limit", () => {
		for (const field of hackFields("a".repeat(32), hackData(), first)) {
			expect(field.value.length).toBeLessThanOrEqual(1_024);
		}
	});
});

describe("hackProgress", () => {
	it("fills as the stages pass and ends at 100%", () => {
		expect(hackProgress(0, 4, 4)).toBe("`[░░░░]` 0%");
		expect(hackProgress(2, 4, 4)).toBe("`[██░░]` 50%");
		expect(hackProgress(HACK_STAGES.length, HACK_STAGES.length, 4)).toBe("`[████]` 100%");
	});

	it("clamps a step outside the range and survives a zero total", () => {
		expect(hackProgress(9, 4, 4)).toBe("`[████]` 100%");
		expect(hackProgress(-1, 4, 4)).toBe("`[░░░░]` 0%");
		expect(hackProgress(0, 0, 4)).toBe("`[████]` 100%");
	});
});
