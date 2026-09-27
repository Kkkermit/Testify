import { damp, fieldPositions, fieldSizes, parallaxTarget, renderScale } from "@/lib/three/field";

/** A deterministic stand-in for Math.random, so a scatter can be asserted on exactly. */
function sequence(values: number[]): () => number {
	let index = 0;
	return () => values[index++ % values.length] ?? 0;
}

const SHAPE = { count: 4, spread: 10, depth: 100 };

describe("fieldPositions", () => {
	it("gives three components per point", () => {
		expect(fieldPositions(SHAPE).length).toBe(12);
	});

	it("keeps every point inside the slab it was asked for", () => {
		const positions = fieldPositions({ count: 200, spread: 10, depth: 100 });

		for (let index = 0; index < positions.length; index += 3) {
			expect(Math.abs(positions[index] ?? 0)).toBeLessThanOrEqual(10);
			expect(Math.abs(positions[index + 1] ?? 0)).toBeLessThanOrEqual(10);
			expect(positions[index + 2]).toBeLessThanOrEqual(0);
			expect(positions[index + 2]).toBeGreaterThanOrEqual(-100);
		}
	});

	/** Every point sits in front of the camera; one behind it is a dot that never appears. */
	it("puts the whole field in front of the camera", () => {
		const positions = fieldPositions(SHAPE, sequence([0, 0, 0]));
		expect(positions[2]).toBe(-0);
	});

	it("treats a negative count as an empty field rather than throwing", () => {
		expect(fieldPositions({ ...SHAPE, count: -5 }).length).toBe(0);
	});
});

describe("fieldSizes", () => {
	it("gives one size per point", () => {
		const positions = fieldPositions(SHAPE);
		expect(fieldSizes(positions, 100).length).toBe(4);
	});

	it("draws a near point larger than a far one", () => {
		const positions = new Float32Array([0, 0, -1, 0, 0, -99]);
		const sizes = fieldSizes(positions, 100);

		expect(sizes[0]).toBeGreaterThan(sizes[1] ?? 0);
	});

	it("stays within the range it was given", () => {
		const positions = fieldPositions({ count: 50, spread: 10, depth: 100 });

		for (const size of fieldSizes(positions, 100, 1, 3)) {
			expect(size).toBeGreaterThanOrEqual(1);
			expect(size).toBeLessThanOrEqual(3);
		}
	});

	it("survives a flat field, where every point is the same distance away", () => {
		expect([...fieldSizes(new Float32Array([0, 0, 0]), 0, 1, 3)]).toEqual([3]);
	});
});

describe("damp", () => {
	it("moves towards the target without passing it", () => {
		const next = damp(0, 10, 2, 0.016);
		expect(next).toBeGreaterThan(0);
		expect(next).toBeLessThan(10);
	});

	it("does nothing over no time at all", () => {
		expect(damp(3, 10, 2, 0)).toBe(3);
	});

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

	it("rests at the centre", () => {
		const target = parallaxTarget({ x: 500, y: 250 }, viewport, 2);

		expect(target.x).toBeCloseTo(0);
		expect(target.y).toBeCloseTo(0);
	});

	it("reaches the full strength at an edge", () => {
		expect(parallaxTarget({ x: 1000, y: 250 }, viewport, 2).x).toBeCloseTo(2);
	});

	it("leans towards the pointer rather than away from it", () => {
		expect(parallaxTarget({ x: 500, y: 0 }, viewport, 2).y).toBeCloseTo(2);
	});

	it("gives up rather than dividing by a zero-sized window", () => {
		expect(parallaxTarget({ x: 5, y: 5 }, { width: 0, height: 0 }, 2)).toEqual({ x: 0, y: 0 });
	});
});

describe("renderScale", () => {
	it("caps a retina display, which costs four times the fragments for no visible gain", () => {
		expect(renderScale(3)).toBe(1.5);
	});

	it("never drops below one, which would render blurrier than the screen", () => {
		expect(renderScale(0.5)).toBe(1);
	});

	it("passes an ordinary ratio through", () => {
		expect(renderScale(1.25)).toBe(1.25);
	});
});
