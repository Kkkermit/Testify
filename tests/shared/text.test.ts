import {
	nicknamePatch,
	plainLine,
	plainText,
	prefixPatch,
	sanitiseText,
	verificationBlocked,
	welcomePatchSchema,
} from "@testify/shared";

/**
 * The sanitiser every free-text field runs through. These are not HTML defences — nothing renders these as
 * HTML — they are defences against a stored string reading as something other than what was typed.
 */
describe("sanitiseText", () => {
	it("leaves ordinary text alone, including the angle brackets Discord needs", () => {
		expect(sanitiseText("Welcome <@123>, you are member <#456>!")).toBe("Welcome <@123>, you are member <#456>!");
	});

	it("keeps the newlines and tabs a multi-line template is written with", () => {
		expect(sanitiseText("one\ntwo\tthree")).toBe("one\ntwo\tthree");
	});

	it("strips control characters", () => {
		expect(sanitiseText("hel\u0000lo\u0007")).toBe("hello");
	});

	/** U+202E reverses everything after it, so a stored value can read as the opposite of what was saved. */
	it("strips bidirectional overrides and zero-width characters", () => {
		expect(sanitiseText("go\u202eod")).toBe("good");
		expect(sanitiseText("a\u200bb\ufeffc")).toBe("abc");
	});

	/** Two ways of writing é compare unequal, so a name saved one way is not found by a search for the other. */
	it("normalises to a single Unicode form", () => {
		expect(sanitiseText("e\u0301")).toBe(sanitiseText("\u00e9"));
	});
});

describe("plainText and plainLine", () => {
	it("counts length after stripping, so padding with invisible characters does not pass", () => {
		expect(plainText(3, 10).safeParse("a\u200b\u200b").success).toBe(false);
		expect(plainText(3, 10).safeParse("abc").success).toBe(true);
	});

	it("folds the whitespace in a single-line field", () => {
		expect(plainLine(1, 20).parse("  two   words \n here ")).toBe("two words here");
	});
});

describe("the schemas that carry free text", () => {
	it("sanitises a welcome message rather than storing what was posted", () => {
		const parsed = welcomePatchSchema.parse({ message: " Hi \u202e{user} " });
		expect(parsed.message).toBe("Hi {user}");
	});

	/** A prefix of invisible characters would match every message while looking empty in the box. */
	it("refuses a prefix that is only invisible characters", () => {
		expect(prefixPatch.safeParse({ prefix: "\u200b\u200b" }).success).toBe(false);
	});

	it("reads a nickname of nothing but spaces as clearing it", () => {
		expect(nicknamePatch.parse({ nickname: "   " }).nickname).toBeNull();
	});
});

/** The page reads this to decide whether a Post button would work, so it has to name what is missing. */
describe("verificationBlocked", () => {
	it("names both when neither is chosen", () => {
		expect(verificationBlocked({ channelId: null, roleId: null })).toMatch(/a channel and a role/i);
	});

	it("names only the one that is missing", () => {
		expect(verificationBlocked({ channelId: "1", roleId: null })).toMatch(/a role to grant/i);
		expect(verificationBlocked({ channelId: null, roleId: "1" })).toMatch(/a channel/i);
	});

	it("says nothing when both are chosen", () => {
		expect(verificationBlocked({ channelId: "1", roleId: "2" })).toBeNull();
	});
});
