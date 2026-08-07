import { AUTOMOD_LIMITS, AUTOMOD_PRESET_LABELS, AUTOMOD_PRESETS, automodBlocked, automodCreate } from "@testify/shared";

describe("automodCreate", () => {
	it("takes each preset that needs nothing else", () => {
		expect(automodCreate.safeParse({ preset: "flagged-words" }).success).toBe(true);
		expect(automodCreate.safeParse({ preset: "spam" }).success).toBe(true);
	});

	it("refuses a preset Testify does not build", () => {
		expect(automodCreate.safeParse({ preset: "member-profile" }).success).toBe(false);
	});

	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a mention limit that arrived as text", () => {
		const parsed = automodCreate.parse({ preset: "mention-spam", limit: "9" });

		expect(parsed).toEqual({ preset: "mention-spam", limit: 9 });
	});

	it("holds the mention limit to what Discord accepts", () => {
		const at = (limit: number): boolean => automodCreate.safeParse({ preset: "mention-spam", limit }).success;

		expect(at(AUTOMOD_LIMITS.minMentions - 1)).toBe(false);
		expect(at(AUTOMOD_LIMITS.maxMentions + 1)).toBe(false);
		expect(at(AUTOMOD_LIMITS.maxMentions)).toBe(true);
	});

	it("refuses a fractional mention limit", () => {
		expect(automodCreate.safeParse({ preset: "mention-spam", limit: 2.5 }).success).toBe(false);
	});

	it("refuses an empty keyword and one past the limit", () => {
		expect(automodCreate.safeParse({ preset: "keyword", word: "   " }).success).toBe(false);
		expect(
			automodCreate.safeParse({ preset: "keyword", word: "x".repeat(AUTOMOD_LIMITS.maxKeyword + 1) }).success,
		).toBe(false);
	});

	/** The keyword is stored by Discord and shown back in its UI, so it takes the same strip as every field. */
	it("refuses HTML but keeps Discord syntax", () => {
		expect(automodCreate.safeParse({ preset: "keyword", word: "<b>rude</b>" }).success).toBe(false);
		expect(automodCreate.safeParse({ preset: "keyword", word: "<@100000000000000001>" }).success).toBe(true);
	});

	/** A limit sent with the keyword preset is not a keyword rule, and must not be silently accepted as one. */
	it("does not take a mention limit as a keyword rule", () => {
		expect(automodCreate.safeParse({ preset: "keyword", limit: 5 }).success).toBe(false);
	});
});

describe("automodBlocked", () => {
	it("asks for the word before a keyword rule can be added", () => {
		expect(automodBlocked({ preset: "keyword", word: "  ", limit: 5 })).toMatch(/word or phrase/i);
	});

	it("asks for a number before a mention rule can be added", () => {
		expect(automodBlocked({ preset: "mention-spam", word: "", limit: Number.NaN })).toMatch(/how many mentions/i);
	});

	it("says nothing for a preset that needs no input", () => {
		expect(automodBlocked({ preset: "spam", word: "", limit: 5 })).toBeNull();
		expect(automodBlocked({ preset: "flagged-words", word: "", limit: 5 })).toBeNull();
	});

	it("says nothing once the draft is complete", () => {
		expect(automodBlocked({ preset: "keyword", word: "rude", limit: 5 })).toBeNull();
		expect(automodBlocked({ preset: "mention-spam", word: "", limit: 7 })).toBeNull();
	});
});

/** The form renders a row per preset, so a preset with no copy would render a blank option. */
describe("AUTOMOD_PRESET_LABELS", () => {
	it("describes every preset the form offers", () => {
		for (const preset of AUTOMOD_PRESETS) {
			expect(AUTOMOD_PRESET_LABELS[preset].label.length).toBeGreaterThan(0);
			expect(AUTOMOD_PRESET_LABELS[preset].describes.length).toBeGreaterThan(0);
		}
	});
});
