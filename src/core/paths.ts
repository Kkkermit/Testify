import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** `__dirname` is `src/core` while developing and `dist/core` after a build. */
const ASSETS = ((): string => {
	const candidates = [resolve(__dirname, "..", "assets"), resolve(__dirname, "..", "..", "assets")];
	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[1]!;
})();

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
