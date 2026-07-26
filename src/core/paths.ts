import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `__dirname` is `src/core` while developing and `dist/core` after a build. The
 * build copies `assets/` into `dist/`, so the folder sits one level up in
 * development and inside the tree after a build — this finds it either way.
 */
const ASSETS = ((): string => {
	const candidates = [resolve(__dirname, "..", "assets"), resolve(__dirname, "..", "..", "assets")];
	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[1]!;
})();

export function assetPath(...segments: string[]): string {
	return resolve(ASSETS, ...segments);
}

/** JSON data files live in `assets/jsons/`. */
export function jsonPath(...segments: string[]): string {
	return assetPath("jsons", ...segments);
}
