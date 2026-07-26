import {
	allPerks,
	findPerk,
	randomBuild,
	renderDescription,
	searchPerks,
} from "../../src/features/community/services/dbdPerks";

describe("perk index", () => {
	it("loads both roles", () => {
		expect(allPerks("survivor").length).toBeGreaterThan(50);
		expect(allPerks("killer").length).toBeGreaterThan(50);
		expect(allPerks()).toHaveLength(allPerks("survivor").length + allPerks("killer").length);
	});

	it("finds a perk by exact name, key and partial match", () => {
		expect(findPerk("Adrenaline")?.name).toBe("Adrenaline");
		expect(findPerk("ace_in_the_hole")?.name).toBe("Ace in the Hole");
		expect(findPerk("adrenal")?.name).toBe("Adrenaline");
	});

	it("returns undefined for an unknown perk", () => {
		expect(findPerk("definitely not a perk")).toBeUndefined();
	});

	it("searches case-insensitively and caps the result count", () => {
		expect(searchPerks("a").length).toBeLessThanOrEqual(25);
		expect(searchPerks("ADREN")[0]?.name).toBe("Adrenaline");
	});
});

describe("renderDescription", () => {
	it("strips markup and substitutes tunables", () => {
		const perk = findPerk("Ace in the Hole");
		const rendered = renderDescription(perk!);

		expect(rendered).not.toContain("<br>");
		expect(rendered).not.toContain("{0}");
	});
});

describe("randomBuild", () => {
	it("returns four distinct perks for the requested role", () => {
		let index = 0;
		const build = randomBuild("killer", () => index++ % 3);

		expect(build).toHaveLength(4);
		expect(new Set(build.map((perk) => perk.key)).size).toBe(4);
		expect(build.every((perk) => perk.role === "killer")).toBe(true);
	});
});
