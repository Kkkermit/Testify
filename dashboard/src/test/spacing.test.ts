import { everySource, offenders } from "./sourceFiles";

/**
 * §19.6's spacing scale, enforced on every run.
 *
 * Five values do all the work — `gap-1` `gap-2` `gap-3` `gap-4` `gap-6` — and a screen reaching for a sixth is
 * usually solving a nesting problem instead. Before this existed the commands page had a `gap-8` between its
 * groups, which is the symptom of exactly that: the sections needed one more level of nesting so the shell's
 * own rhythm would apply to them.
 */

/** Half-steps that came in one at a time. Each is within 2px of a value already on the scale. */
const OFF_SCALE = /\b(?:gap|gap-x|gap-y|space-x|space-y)-(?:0\.5|1\.5|2\.5|3\.5|5|7|8|9|10|11|12)\b/;

/** `p-4` on a card puts its text 8px left of every other card on the page. */
const CARD_PADDING = /\b(?:p|px)-(?:1|2|3|4|5|7|8)\b/;

describe("the spacing scale", () => {
	it("has files to check, so a broken pattern cannot pass vacuously", () => {
		expect(everySource().length).toBeGreaterThan(50);
	});

	it("uses only the five gaps §19.6 records", () => {
		expect(offenders(OFF_SCALE)).toEqual([]);
	});

	/**
	 * `Card` owns the 24px inline padding so every card's content starts on the same column. A card that sets
	 * its own is the "text 8px left of the rest of the page" complaint.
	 */
	it("leaves card padding to Card", () => {
		const inCard = (line: string): boolean => /\bcardClass\(|<Card\b/.test(line);
		expect(offenders(CARD_PADDING, inCard)).toEqual([]);
	});
});
