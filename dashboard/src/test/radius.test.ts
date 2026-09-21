import { everySource, offenders } from "./sourceFiles";

/**
 * One radius scale, and nothing outside it.
 *
 * `--radius-chip` `--radius-field` `--radius-card` `--radius-tile` are declared in `index.css`, which is what
 * makes a fork's rebrand one file — and Tailwind's own `rounded`, `rounded-sm` and `rounded-md` sit at 4px, 2px
 * and 6px, so a component reaching for one of them is a corner nobody chose. Seventeen call sites had.
 */

/** `rounded-full` is a shape rather than a size: a pill or a dot, and no token could say it better. */
const OFF_SCALE =
	/\brounded(?:-[trbl]{1,2})?-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl)\b|\brounded(?:-[trbl]{1,2})?(?![-\w])/;

describe("the radius scale", () => {
	it("has files to check, so a broken pattern cannot pass vacuously", () => {
		expect(everySource().length).toBeGreaterThan(50);
	});

	it("rounds every corner from a token", () => {
		expect(offenders(OFF_SCALE)).toEqual([]);
	});
});
