import { oneOf } from "@/lib/oneOf";

const TABS = ["general", "rewards", "boosts"] as const;

describe("oneOf", () => {
	/**
	 * The three sources this exists for — a URL, a stored preference and a `<select>` — are none of them typed, and a
	 * near miss such as `general ` with a space is a different string that has to fall back.
	 */
	it("keeps one of the values and falls back, exactly, for anything else", () => {
		expect(oneOf(TABS, "boosts", "general")).toBe("boosts");
		const misses = ["aubergine", null, undefined, "", "Rewards", "rewards "].filter(
			(value) => oneOf(TABS, value, "general") !== "general",
		);

		expect(misses).toEqual([]);
	});
});
