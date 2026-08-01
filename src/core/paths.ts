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
 * The repository root, found by walking up for the `package.json` — `src/core` and `dist/core` sit at different
 * depths under it depending on how the bot was started, so counting `..` gets it wrong in one of the two.
 */
export function repoRoot(from: string = __dirname): string {
	let directory = from;

	for (let depth = 0; depth < 6; depth += 1) {
		if (existsSync(resolve(directory, "package.json"))) return directory;
		directory = resolve(directory, "..");
	}

	return from;
}

/** JSON data files live in `assets/jsons/`. */
export function jsonPath(...segments: string[]): string {
	return assetPath("jsons", ...segments);
}
