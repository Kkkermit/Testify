import { initialOf } from "@/lib/people";

/** Splitting by code point drew half of a flag or a joined emoji as the fallback picture. */
it("takes the first whole character of a name, upper-cased", () => {
	expect([initialOf("  testify"), initialOf("🇬🇧 Bot"), initialOf("👨‍👩‍👧 family"), initialOf("   ")]).toEqual([
		"T",
		"🇬🇧",
		"👨‍👩‍👧",
		null,
	]);
});
