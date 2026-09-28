import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { clusters, drawText, fontCovers, measureText, SANS, textRuns, wrapLines } from "@lib/canvas/text.util";

const NO_SYSTEM = { emoji: [], other: [] };

describe("clusters", () => {
	/** A family emoji or a flag is several code points, and cutting between them draws half a person. */
	it("keeps what a reader sees as one character together", () => {
		expect(clusters("a👨‍👩‍👧🇬🇧b")).toEqual(["a", "👨‍👩‍👧", "🇬🇧", "b"]);
	});
});

describe("textRuns", () => {
	const bundledOnly = (family: string, cluster: string) => family === SANS && /^[\x20-\x7e]+$/.test(cluster);

	it("keeps text the first font can draw in one run", () => {
		expect(textRuns("Kkermit 102", SANS, bundledOnly, NO_SYSTEM)).toEqual([{ text: "Kkermit 102", family: SANS }]);
	});

	/** A name with one character the bundled font lacks was drawn as a box. */
	it("hands a character the bundled fonts lack to an installed font that has it", () => {
		const covers = (family: string, cluster: string) => bundledOnly(family, cluster) || family === "IPAGothic";

		expect(textRuns("Kkermit ツ", SANS, covers, { emoji: [], other: ["IPAGothic"] })).toEqual([
			{ text: "Kkermit ", family: SANS },
			{ text: "ツ", family: "IPAGothic" },
		]);
	});

	/** A symbol font can draw a flag as two boxed letters, so an emoji font is asked first. */
	it("asks an emoji font first for flags and pictographs", () => {
		const covers = () => true;

		expect(textRuns("🇬🇧", SANS, covers, { emoji: ["Noto Color Emoji"], other: ["DejaVu Sans"] })).toEqual([
			{ text: "🇬🇧", family: "Noto Color Emoji" },
		]);
	});

	it("falls back to the first font when nothing has the character", () => {
		expect(textRuns("ツ", SANS, () => false, NO_SYSTEM)).toEqual([{ text: "ツ", family: SANS }]);
	});
});

describe("drawing with the bundled fonts", () => {
	const draw = createCanvas(400, 100).getContext("2d");

	it("finds the bundled font covering Latin and not a private-use character", () => {
		measureText(draw, "x", { size: 20, colour: "#fff" });

		expect(fontCovers(draw, SANS, "K")).toBe(true);
		expect(fontCovers(draw, SANS, "")).toBe(false);
	});

	/** A long name ran under the figure beside it. */
	it("keeps text inside its room, shrinking and then ending in an ellipsis", () => {
		const long = "An extraordinarily long display name that cannot possibly fit";
		const width = drawText(draw, long, 0, 50, { size: 26, colour: "#fff", maxWidth: 200, minSize: 20 });

		expect(width).toBeLessThanOrEqual(200);
		expect(measureText(draw, long, { size: 26, colour: "#fff" })).toBeGreaterThan(200);
	});
});

describe("wrapLines", () => {
	const draw = createCanvas(10, 10).getContext("2d");
	const style = { size: 20, colour: "#fff" };

	it("keeps a short title on one line", () => {
		expect(wrapLines(draw, "Deli Girl", style, 400, 2)).toEqual(["Deli Girl"]);
	});

	/** A music-video title runs to a paragraph; the card holds two lines and says the rest was cut. */
	it("stops at the line limit and ends with an ellipsis", () => {
		const lines = wrapLines(draw, "word ".repeat(60).trim(), style, 200, 2);

		expect(lines).toHaveLength(2);
		expect(lines[1]?.endsWith("…")).toBe(true);
		expect(measureText(draw, lines[1] ?? "", style)).toBeLessThanOrEqual(200);
	});

	it("cuts a single word too long for the line rather than overflowing", () => {
		const [line] = wrapLines(draw, "a".repeat(200), style, 120, 1);

		expect(line?.endsWith("…")).toBe(true);
		expect(measureText(draw, line ?? "", style)).toBeLessThanOrEqual(120);
	});

	it("wraps without a limit when none is given", () => {
		expect(wrapLines(draw, "one two three four five six", style, 90).length).toBeGreaterThan(2);
	});
});

describe("text on every card", () => {
	/** A card that named `sans-serif` got whatever the host chose, which on Windows drew digits and no letters. */
	it("is drawn through drawText and never with a font the host picks", () => {
		const offenders: string[] = [];
		const walk = (directory: string): void => {
			for (const entry of readdirSync(directory)) {
				const path = join(directory, entry);
				if (statSync(path).isDirectory()) walk(path);
				else if (path.endsWith(".ts") && !path.endsWith(join("canvas", "text.util.ts"))) {
					const source = readFileSync(path, "utf8");
					if (/\.(fillText|strokeText)\(|\.font\s*=|sans-serif/.test(source)) offenders.push(path);
				}
			}
		};
		walk(resolve(__dirname, "../../../src"));

		expect(offenders).toEqual([]);
	});
});
