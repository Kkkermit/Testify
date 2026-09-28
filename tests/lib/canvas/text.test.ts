import { createCanvas } from "@napi-rs/canvas";
import { clusters, drawText, fontCovers, measureText, SANS, textRuns } from "@lib/canvas/text.util";

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
