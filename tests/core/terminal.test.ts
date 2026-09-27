import { box, colourEnabled, painter, stepLine, visibleWidth } from "@core/terminal";

describe("colourEnabled", () => {
	it("follows the terminal when nothing says otherwise", () => {
		expect(colourEnabled({ isTTY: true }, {})).toBe(true);
		expect(colourEnabled({ isTTY: false }, {})).toBe(false);
	});

	/** `npm run dev:all` reads each half through a pipe, and would otherwise print the bot's logs as bare JSON. */
	it("keeps colour through a pipe when FORCE_COLOR asks for it", () => {
		expect(colourEnabled({ isTTY: false }, { FORCE_COLOR: "1" })).toBe(true);
		expect(colourEnabled({ isTTY: true }, { FORCE_COLOR: "0" })).toBe(false);
	});

	it("honours NO_COLOR and a dumb terminal", () => {
		expect(colourEnabled({ isTTY: true }, { NO_COLOR: "1" })).toBe(false);
		expect(colourEnabled({ isTTY: true }, { TERM: "dumb" })).toBe(false);
	});
});

describe("visibleWidth", () => {
	it("ignores colour codes", () => {
		expect(visibleWidth(painter(true).bold(painter(true).red("abc")))).toBe(3);
	});

	/** An arrow counted as two columns pushed a box's right edge one column out on the line holding it. */
	it("counts an arrow as one column and an emoji as two", () => {
		expect(visibleWidth("➜ →")).toBe(3);
		expect(visibleWidth("\u{1F916}")).toBe(2);
	});
});

describe("box", () => {
	it("draws every line to the same width, colour or not", () => {
		for (const colour of [true, false]) {
			const lines = box("Title", ["short", painter(colour).bold("a longer ➜ line")], "error", painter(colour));
			expect(new Set(lines.map(visibleWidth)).size).toBe(1);
		}
	});

	it("writes no escape codes when colour is off", () => {
		expect(box("", ["plain"], "info", painter(false)).join("")).not.toContain("\u001b");
	});
});

describe("stepLine", () => {
	it("marks a failure differently from a success, and shows how long it took", () => {
		const paint = painter(false);

		expect(stepLine("done", "Database", "connected", 84, paint)).toBe("  ✔ Database    connected 84ms");
		expect(stepLine("failed", "Database", "no", undefined, paint)).toContain("✖");
	});
});
