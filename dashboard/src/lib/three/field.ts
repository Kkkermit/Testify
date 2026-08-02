/** The geometry and easing behind the backdrop, kept away from three.js so it can be tested without a GPU. */

export interface FieldShape {
	/** How many points to scatter. */
	count: number;
	/** Half-width and half-height of the slab they sit in. */
	spread: number;
	/** How far back the furthest point sits, in the same units. */
	depth: number;
}

/** A slab rather than a sphere: a sphere puts most of its points at the camera, as a smear across the screen. */
export function fieldPositions(shape: FieldShape, random: () => number = Math.random): Float32Array {
	const positions = new Float32Array(Math.max(0, shape.count) * 3);

	for (let index = 0; index < positions.length; index += 3) {
		positions[index] = (random() - 0.5) * 2 * shape.spread;
		positions[index + 1] = (random() - 0.5) * 2 * shape.spread;
		positions[index + 2] = -random() * shape.depth;
	}

	return positions;
}

/** Nearer points are drawn larger, so the field reads as depth rather than as noise of one size. */
export function fieldSizes(positions: Float32Array, depth: number, min = 1, max = 3): Float32Array {
	const sizes = new Float32Array(positions.length / 3);

	for (let index = 0; index < sizes.length; index += 1) {
		const z = positions[index * 3 + 2] ?? 0;
		const nearness = depth === 0 ? 1 : 1 - Math.min(1, Math.abs(z) / depth);
		sizes[index] = min + (max - min) * nearness;
	}

	return sizes;
}

/** `lambda` is the fraction of the remaining distance covered per second, so 30fps and 144fps ease alike. */
export function damp(current: number, target: number, lambda: number, deltaSeconds: number): number {
	return current + (target - current) * (1 - Math.exp(-lambda * deltaSeconds));
}

/** Centre is zero and the edges reach `strength`, so the parallax is symmetrical however the window is shaped. */
export function parallaxTarget(
	pointer: { x: number; y: number },
	viewport: { width: number; height: number },
	strength: number,
): { x: number; y: number } {
	if (viewport.width <= 0 || viewport.height <= 0) return { x: 0, y: 0 };

	return {
		x: (pointer.x / viewport.width - 0.5) * 2 * strength,
		// Screen y grows downwards and world y grows upwards, so the camera leans towards the pointer.
		y: -(pointer.y / viewport.height - 0.5) * 2 * strength,
	};
}

/** Retina costs four times the fragments for a field of soft dots nobody is inspecting. */
export function renderScale(devicePixelRatio: number, cap = 1.5): number {
	return Math.min(Math.max(1, devicePixelRatio), cap);
}
