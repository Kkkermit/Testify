/** gifenc ships no types; this covers the part of it the casino's animations use. */
declare module "gifenc" {
	export type Palette = number[][];

	export interface FrameOptions {
		palette?: Palette;
		/** Milliseconds, rounded by the format to hundredths of a second. */
		delay?: number;
		/** -1 plays once, 0 loops for ever, and a positive number loops that many extra times. */
		repeat?: number;
		transparent?: boolean;
		transparentIndex?: number;
		/** 1 leaves the frame in place for the next to draw over. */
		dispose?: number;
	}

	export interface Encoder {
		writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
		finish(): void;
		bytes(): Uint8Array;
	}

	export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder;
	export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): Palette;
	export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette): Uint8Array;
}
