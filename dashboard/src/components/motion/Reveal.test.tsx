import { revealDelay } from "@/components/motion/Reveal";

describe("revealDelay", () => {
	/** A list of forty servers must not take two seconds to finish arriving. */
	it("caps the stagger so a long list does not read as a slow page", () => {
		expect(revealDelay(400)).toBe(revealDelay(40));
		expect(revealDelay(400)).toBeLessThanOrEqual(240);
	});
});
