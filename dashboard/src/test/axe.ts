import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

/** A floor, not a pass. Colour contrast is off because jsdom computes no styles, so that rule can only report false negatives. */
export async function expectNoViolations(container: Element): Promise<void> {
	const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
	expect(results).toHaveNoViolations();
}
