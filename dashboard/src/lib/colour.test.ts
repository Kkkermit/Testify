import {
	COLOUR_TEXT_MAX,
	fromHsl,
	parseColour,
	readHex,
	sanitiseColourText,
	toHex,
	toHsl,
	toHslText,
	toRgbText,
} from "@/lib/colour";

describe("parseColour", () => {
	/** Each row is what somebody might type and the colour it should be read as, or null for a refusal. */
	it("reads a hex code, RGB and HSL, and refuses anything else", () => {
		const cases: [typed: string, expected: string | null][] = [
			["#8b2c6b", "#8b2c6b"],
			["8B2C6B", "#8b2c6b"],
			["  #8b2c6b  ", "#8b2c6b"],
			["#f0a", "#ff00aa"],
			["rgb(139, 44, 107)", "#8b2c6b"],
			["RGB(139,44,107)", "#8b2c6b"],
			["rgb(139 44 107)", "#8b2c6b"],
			["rgba(139, 44, 107, 0.5)", "#8b2c6b"],
			["rgb(139 44 107 / 50%)", "#8b2c6b"],
			["139, 44, 107", "#8b2c6b"],
			["139 44 107", "#8b2c6b"],
			["hsl(320, 52%, 36%)", "#8c2c6c"],
			["hsl(320deg 52% 36%)", "#8c2c6c"],
			["hsla(0, 100%, 50%, 1)", "#ff0000"],
			["hsl(-40, 52%, 36%)", "#8c2c6c"],
			// Three digits without a hash are a number, not a hex code.
			["255", null],
			["#8b2c6", null],
			["#gggggg", null],
			["rgb(256, 0, 0)", null],
			["rgb(1, 2)", null],
			["rgb(1, 2, 3, 4, 5)", null],
			["rgb(1, 2, x)", null],
			["rgb(-1, 2, 3)", null],
			["hsl(0, 120%, 50%)", null],
			["hsl(0, 50%)", null],
			["calc(1, 2, 3)", null],
			["rebeccapurple", null],
			["", null],
			[`#8b2c6b${" ".repeat(50)}x`, null],
		];

		const wrong = cases.flatMap(([typed, expected]) => {
			const read = parseColour(typed);
			const got = read === null ? null : toHex(read);
			return got === expected ? [] : [`${JSON.stringify(typed)}: ${String(got)} instead of ${String(expected)}`];
		});

		expect(wrong).toEqual([]);
	});
});

describe("hostile input", () => {
	/** What reaches a style property is always six hex digits written by `toHex`, so anything else is refused unread. */
	it("refuses markup, script and CSS smuggled in beside or instead of a colour", () => {
		const hostile = [
			"<script>alert(1)</script>",
			"#8b2c6b<img src=x onerror=alert(1)>",
			"data:text/html,<b>x</b>",
			"red; background: url(https://example.com/x)",
			"rgb(1, 2, 3); --x: url(y)",
			"#8b2c6b;}body{display:none",
			"expression(alert(1))",
			"url(https://example.com/x)",
			"rgb(1, 2, 3)\u202e",
			"#8b2c6b\u0000",
			"rgb(1,\t2, 3)",
			'"#8b2c6b"',
			"&#35;8b2c6b",
		];

		expect(hostile.filter((text) => parseColour(text) !== null)).toEqual([]);
	});

	it("keeps only the characters a colour is written with, and no more of them than any colour needs", () => {
		expect(sanitiseColourText('<img src="x" onerror=alert(1)>')).toBe("img srcx onerroralert(1)");
		expect(sanitiseColourText("#8b2c6b;}{\\'\"`<>=:&\u202e\u0000\n")).toBe("#8b2c6b");
		expect(sanitiseColourText("rgb(139, 44, 107 / 50%)")).toBe("rgb(139, 44, 107 / 50%)");
		expect(sanitiseColourText("1".repeat(500))).toHaveLength(COLOUR_TEXT_MAX);
	});
});

describe("readHex", () => {
	/** Storage holds whatever was last written to it, so only the one shape the page writes is read back. */
	it("reads only a lowercase six-digit code", () => {
		expect(readHex("#8b2c6b")).toEqual({ r: 139, g: 44, b: 107 });
		expect([readHex(null), readHex("#8B2C6B"), readHex("8b2c6b"), readHex("red"), readHex("#8b2c6b;x")]).toEqual([
			null,
			null,
			null,
			null,
			null,
		]);
	});
});

describe("the conversions", () => {
	it("writes a colour in each format somebody can type back in", () => {
		const colour = { r: 139, g: 44, b: 107 };

		expect([toHex(colour), toRgbText(colour), toHslText(colour)]).toEqual([
			"#8b2c6b",
			"rgb(139, 44, 107)",
			"hsl(320, 52%, 36%)",
		]);
		expect(parseColour(toRgbText(colour))).toEqual(colour);
	});

	it("comes back to the same colour through HSL, across the colour space", () => {
		const drift: string[] = [];
		for (let r = 0; r <= 255; r += 51) {
			for (let g = 0; g <= 255; g += 51) {
				for (let b = 0; b <= 255; b += 51) {
					const colour = { r, g, b };
					const back = fromHsl(toHsl(colour));
					if (toHex(back) !== toHex(colour)) drift.push(`${toHex(colour)} came back as ${toHex(back)}`);
				}
			}
		}

		expect(drift).toEqual([]);
	});
});
