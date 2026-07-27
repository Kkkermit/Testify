import { bannerLines, bigText, ICONS } from "@lib/banner.util";

const FACTS = {
	name: "Testify",
	servers: 12,
	members: 48_213,
	commands: 87,
	prefix: "t?",
	scope: "every server",
	startupMs: 1_843,
	loaded: { commands: 87, buttons: 10, events: 16, messageHandlers: 8 },
	watching: false,
};
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
		expect(text).toContain("every server");
	});

	it("reports what the loader found, so a category failing to load is visible", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("87 loaded");
		expect(text).toContain("16 loaded");
		expect(text).toContain("8 loaded");
	});

	it("labels each fact with an icon", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("🤖");
		expect(text).toContain("📦 Loaded from disk");
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

/**
 * The rows are padded on the assumption that every icon takes two terminal
 * columns. A glyph without `Emoji_Presentation` renders one column wide, which
 * silently pulls that one row's colon out of line — the exact bug U+1F5C3 caused
 * in the "Loaded from disk" block.
 */
describe("row icons", () => {
	it.each(Object.entries(ICONS))("%s renders two columns wide", (_name, icon) => {
		expect(icon).toMatch(/^\p{Emoji_Presentation}$/u);
	});

	it("lines every colon up in the same column", () => {
		const rows = bannerLines(FACTS, false).filter((line) => line.includes(" : "));
		expect(rows.length).toBeGreaterThan(4);

		// Two columns per icon, one per remaining character.
		const columnOf = (row: string): number => {
			const upToColon = row.slice(0, row.indexOf(":"));
			return [...upToColon].reduce((n, char) => n + (/\p{Emoji_Presentation}/u.test(char) ? 2 : 1), 0);
		};

		expect(new Set(rows.map(columnOf)).size).toBe(1);
	});
});

describe("the hot reload notice", () => {
	it("is shown while watching, so a dev knows saving will restart the bot", () => {
		expect(bannerLines({ ...FACTS, watching: true }, false).join("\n")).toContain("Hot reload is on");
	});

	it("is absent in production", () => {
		expect(bannerLines({ ...FACTS, watching: false }, false).join("\n")).not.toContain("Hot reload");
	});
});
