import { existsSync } from "node:fs";
import { resolve } from "node:path";

// The build copies them into `dist/assets`; running from source reads the repository's own.
const BESIDE_BUILD = resolve(__dirname, "..", "assets");
const ASSETS = existsSync(BESIDE_BUILD) ? BESIDE_BUILD : resolve(__dirname, "..", "..", "assets");

export function assetPath(...segments: string[]): string {
	return resolve(ASSETS, ...segments);
}

/**
 * The repository root, found by walking up to `package.json`, since `src/core` and `dist/core` sit at different depths.
 */
export function repoRoot(from: string = __dirname): string {
	let directory = from;

	for (let depth = 0; depth < 6; depth += 1) {
		if (existsSync(resolve(directory, "package.json"))) return directory;
		directory = resolve(directory, "..");
	}

	return from;
}

export function dataPath(...segments: string[]): string {
	return assetPath("data", ...segments);
}
