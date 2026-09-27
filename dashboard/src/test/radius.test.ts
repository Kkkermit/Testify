import { everyModule, offenders } from "./sourceFiles";

/** Only the four radius tokens from `index.css`; Tailwind's own sizes are corners nobody chose. */

/** `rounded-full` is a shape rather than a size: a pill or a dot, and no token could say it better. */
const OFF_SCALE =
	/\brounded(?:-[trbl]{1,2})?-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl)\b|\brounded(?:-[trbl]{1,2})?(?![-\w])/;

describe("the radius scale", () => {
	it("has files to check, so a broken pattern cannot pass vacuously", () => {
		expect(everyModule().length).toBeGreaterThan(50);
	});

	it("rounds every corner from a token", () => {
		expect(offenders(OFF_SCALE, undefined, everyModule())).toEqual([]);
	});
});
