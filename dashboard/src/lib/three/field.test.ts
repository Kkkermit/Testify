import { damp, fieldPositions, fieldSizes, parallaxTarget, renderScale } from "@/lib/three/field";

/** A deterministic stand-in for Math.random, so a scatter can be asserted on exactly. */
function sequence(values: number[]): () => number {
	let index = 0;
	return () => values[index++ % values.length] ?? 0;
}

const SHAPE = { count: 4, spread: 10, depth: 100 };

describe("fieldPositions", () => {
	/** Every point sits in front of the camera; one behind it is a dot that never appears. */
	it("puts the whole field in front of the camera", () => {
		const positions = fieldPositions(SHAPE, sequence([0, 0, 0]));
		expect(positions[2]).toBe(-0);
	});
});

describe("fieldSizes", () => {
	it("gives one size per point", () => {
		const positions = fieldPositions(SHAPE);
		expect(fieldSizes(positions, 100).length).toBe(4);
	});
});

describe("damp", () => {
	/** The same elapsed time has to produce the same movement whether it arrived as one long frame or several short ones. */
	it("covers the same ground at 30fps as at 120fps", () => {
		const slow = damp(0, 10, 4, 1 / 30);

		let fast = 0;
		for (let step = 0; step < 4; step += 1) fast = damp(fast, 10, 4, 1 / 120);

		expect(fast).toBeCloseTo(slow, 6);
	});
});

describe("parallaxTarget", () => {
	const viewport = { width: 1000, height: 500 };

	it("leans towards the pointer rather than away from it", () => {
		expect(parallaxTarget({ x: 500, y: 0 }, viewport, 2).y).toBeCloseTo(2);
	});
});

describe("renderScale", () => {
	it("never drops below one, which would render blurrier than the screen", () => {
		expect(renderScale(0.5)).toBe(1);
	});
});
