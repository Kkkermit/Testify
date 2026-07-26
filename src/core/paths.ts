import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `__dirname` is `src/core` under tsx and `dist/core` after a build. Both trees keep
 * the same shape, so every path here is derived from this module's own location and
 * never from `process.cwd()` — which is what made the previous loader unable to run
 * from `dist/`.
 */
export const SOURCE_ROOT = resolve(__dirname, "..");

/**
 * The build copies `assets/` to `dist/assets/`, so the directory sits one level up
 * from the source root in development and inside it after a build.
 */
export const ASSETS_ROOT = ((): string => {
	const candidates = [resolve(SOURCE_ROOT, "assets"), resolve(SOURCE_ROOT, "..", "assets")];
	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[1]!;
})();

export function assetPath(...segments: string[]): string {
	return resolve(ASSETS_ROOT, ...segments);
}

export function imagePath(...segments: string[]): string {
	return assetPath("images", ...segments);
}

export function jsonPath(...segments: string[]): string {
	return assetPath("jsons", ...segments);
}
