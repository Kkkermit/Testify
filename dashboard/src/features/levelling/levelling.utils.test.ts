import { LEVEL_LIMITS } from "@testify/shared";
import { multiplierChoices, roleNameOf, tabFrom } from "@/features/levelling/levelling.utils";

describe("tabFrom", () => {
	it("accepts a real tab", () => {
		expect(tabFrom("boosts")).toBe("boosts");
	});

	it("falls back to the first tab for anything else in the URL", () => {
		expect(tabFrom("nonsense")).toBe("general");
		expect(tabFrom(null)).toBe("general");
	});
});

describe("roleNameOf", () => {
	const roles = [{ id: "1", name: "Regulars" }];

	it("names a role it knows", () => {
		expect(roleNameOf(roles, "1")).toBe("Regulars");
	});

	/** A role deleted in Discord after being configured here still has to render as something. */
	it("says a role is gone rather than rendering an empty row", () => {
		expect(roleNameOf(roles, "999")).toBe("A deleted role");
	});
});

describe("multiplierChoices", () => {
	it("covers the whole allowed range, ends included", () => {
		const choices = multiplierChoices();

		expect(choices[0]).toBe(LEVEL_LIMITS.minMultiplier);
		expect(choices.at(-1)).toBe(LEVEL_LIMITS.maxMultiplier);
	});
});
