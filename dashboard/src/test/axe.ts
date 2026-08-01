import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

/**
 * The automated half of the accessibility check. It catches roughly 40% of issues — missing labels, bad ARIA,
 * broken heading order — so it is a floor, not a pass; `10-ACCESSIBILITY.md` lists the manual passes that cover
 * the rest.
 *
 * Colour contrast is off because jsdom computes no styles, so the rule can only report false negatives here.
 * The real ratios are worked out in `08-DESIGN.md` and checked against the rendered page.
 */
export async function expectNoViolations(container: Element): Promise<void> {
	const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
	expect(results).toHaveNoViolations();
}
