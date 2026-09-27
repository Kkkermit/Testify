import { type SKRSContext2D, createCanvas } from "@napi-rs/canvas";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

/** Animations for the casino: frames drawn on one canvas and written as a GIF that plays once. */

export interface AnimationFrame {
	/** Draws the whole frame; the canvas is not cleared in between. */
	draw(ctx: SKRSContext2D): void;
	delay: number;
}

/** The last palette slot is kept for "unchanged", so a frame only carries the pixels that moved. */
const TRANSPARENT = 255;

/** A plain view rather than the canvas's own array, which gifenc's `instanceof` check refuses from another realm. */
function pixelsOf(ctx: SKRSContext2D, width: number, height: number): Uint8Array {
	const { data } = ctx.getImageData(0, 0, width, height);

	return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

/** Where a frame's indices match the one before, the transparent slot, so the encoder compresses the run away. */
export function onlyChanged(current: Uint8Array, previous: Uint8Array | null): Uint8Array {
	if (previous === null) return current;

	const out = new Uint8Array(current.length);
	for (let index = 0; index < current.length; index += 1) {
		out[index] = current[index] === previous[index] ? TRANSPARENT : current[index]!;
	}

	return out;
}

/** One palette for every frame, sampled from the first and last, which between them hold every colour drawn. */
export function encodeAnimation(width: number, height: number, frames: readonly AnimationFrame[]): Buffer {
	if (frames.length === 0) throw new Error("An animation needs at least one frame");

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	frames[0]!.draw(ctx);
	const first = pixelsOf(ctx, width, height);
	frames.at(-1)!.draw(ctx);
	const last = pixelsOf(ctx, width, height);

	const sample = new Uint8Array(first.length + last.length);
	sample.set(first);
	sample.set(last, first.length);

	const palette = quantize(sample, TRANSPARENT);
	while (palette.length <= TRANSPARENT) palette.push([0, 0, 0]);

	const gif = GIFEncoder();
	let previous: Uint8Array | null = null;

	frames.forEach((frame, index) => {
		frame.draw(ctx);
		const indexed = applyPalette(pixelsOf(ctx, width, height), palette);

		gif.writeFrame(onlyChanged(indexed, previous), width, height, {
			...(index === 0 ? { palette } : {}),
			delay: frame.delay,
			repeat: -1,
			transparent: index > 0,
			transparentIndex: TRANSPARENT,
			dispose: 1,
		});
		previous = indexed;
	});

	gif.finish();

	return Buffer.from(gif.bytes());
}
