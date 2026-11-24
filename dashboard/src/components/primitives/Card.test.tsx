import { cardClass } from "@/components/primitives/Card";

describe("cardClass", () => {
	/** A card that sets its own `p-4` puts its content 8px left of every other card on the page. */
	it("gives every density the same inline padding, and carries the surface into a card that cannot be a div", () => {
		for (const padding of ["compact", "default"] as const) {
			expect(cardClass(padding)).toMatch(/(^|\s)(p-6|px-6)(\s|$)/);
		}
		expect(cardClass("compact")).toContain("bg-card");
		expect(cardClass("compact")).toContain("rounded-card");
	});
});
