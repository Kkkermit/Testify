import { bannerLines, bigText } from "../../src/lib/banner";

const FACTS = { name: "Testify", servers: 12, members: 48_213, commands: 87, prefix: "t?", startupMs: 1_843 };
const ESCAPE = "";

describe("bigText", () => {
	it("renders six lines whatever the word", () => {
		expect(bigText("Testify")).toHaveLength(6);
		expect(bigText("A")).toHaveLength(6);
	});

	it("makes every line the same width, so the block is rectangular", () => {
		const widths = new Set(bigText("Testify").map((line) => [...line].length));
		expect(widths.size).toBe(1);
	});

	it("skips characters it has no glyph for rather than breaking the block", () => {
		const widths = new Set(bigText("A-B!").map((line) => [...line].length));
		expect(widths.size).toBe(1);
	});

	it("returns nothing for a name it cannot draw at all", () => {
		expect(bigText("!!!")).toEqual([]);
	});
});

describe("bannerLines", () => {
	it("reports the facts it was given", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("Testify");
		expect(text).toContain("48,213");
		expect(text).toContain("1,843ms");
		expect(text).toContain("t?");
	});

	it("leaves out colour when the output is not a terminal", () => {
		expect(bannerLines(FACTS, false).join("")).not.toContain(ESCAPE);
	});

	it("colours it when it is", () => {
		expect(bannerLines(FACTS, true).join("")).toContain(ESCAPE);
	});

	it("survives a bot named something it cannot draw", () => {
		expect(() => bannerLines({ ...FACTS, name: "!!!" }, false)).not.toThrow();
	});
});
