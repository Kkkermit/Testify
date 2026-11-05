import { everyModule, offenders } from "./sourceFiles";

/** `primary` is a fill that only ever wears white, and in the dark theme it reads at 3.3:1 as text; `accent` is the text cut. */
const FILL_AS_TEXT = /\btext-primary(?!-foreground)\b/;

describe("the accent as text", () => {
	it("writes text in the accent's text cut, never in its fill", () => {
		expect(offenders(FILL_AS_TEXT, undefined, everyModule())).toEqual([]);
	});
});
