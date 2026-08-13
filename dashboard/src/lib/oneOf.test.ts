import { oneOf } from "@/lib/oneOf";

const TABS = ["general", "rewards", "boosts"] as const;

describe("oneOf", () => {
	it("returns the value when it is one of the options", () => {
		expect(oneOf(TABS, "rewards", "general")).toBe("rewards");
	});

	/** The three sources this exists for: a URL, a stored preference and a `<select>` — none of them typed. */
	it("falls back for anything that is not", () => {
		expect(oneOf(TABS, "aubergine", "general")).toBe("general");
		expect(oneOf(TABS, null, "general")).toBe("general");
		expect(oneOf(TABS, undefined, "general")).toBe("general");
		expect(oneOf(TABS, "", "general")).toBe("general");
	});

	/** A near miss is not a match: `general ` with a space is a different string and has to fall back. */
	it("compares exactly, rather than loosely", () => {
		expect(oneOf(TABS, "General", "general")).toBe("general");
		expect(oneOf(TABS, "general ", "rewards")).toBe("rewards");
	});
});
