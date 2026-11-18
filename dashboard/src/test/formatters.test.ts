import { everyModule, offenders } from "./sourceFiles";

/** Only the two shared modules build a formatter, because only they are handed a language the browser accepts. */

const HAND_BUILT =
	/new Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat|PluralRules|ListFormat)\b|\.toLocale(?:Date|Time)?String\(/;
const SHARED = /[\\/]lib[\\/](?:intl|datetime)\.ts$/;

describe("formatting", () => {
	it("has files to check, so a broken pattern cannot pass vacuously", () => {
		expect(everyModule().length).toBeGreaterThan(50);
	});

	/** A formatter built from `i18n.language` threw on Chromium's `en-US@posix` and took the birthdays page down. */
	it("builds every date, number and unit formatter in lib/intl.ts or lib/datetime.ts", () => {
		const files = everyModule().filter((path) => !SHARED.test(path));
		expect(offenders(HAND_BUILT, undefined, files)).toEqual([]);
	});
});
