import { globSync } from "glob";
import { ModuleLoadError } from "./errors";
import { type Logger } from "./logger";
import { SOURCE_ROOT } from "./paths";

/**
 * Compiled-safe module discovery. Patterns resolve from this module's own tree —
 * `src/` under tsx, `dist/` after a build — so the same code finds the same files
 * in both, which the previous `fs.readdirSync("./src/…")` calls could not do.
 */
export function discover(pattern: string): string[] {
	// Under tsx and Jest the tree is TypeScript; after a build it is JavaScript.
	// Globbing both keeps `npm run dev` and `npm start` loading the same modules.
	return globSync(pattern, {
		cwd: SOURCE_ROOT,
		absolute: true,
		nodir: true,
		ignore: ["**/*.d.ts", "**/*.map", "**/*.test.*"],
	}).sort();
}

/** Expands a bare module pattern to the extensions this runtime can load. */
export function modulePattern(relative: string): string {
	return `${relative}.{js,ts}`;
}

export interface LoadResult<T> {
	module: T;
	file: string;
}

/**
 * Loads every module matching `pattern`, validating each one. A file that fails
 * validation fails the boot with its own filename attached, instead of throwing an
 * opaque error deep inside the loader the way the previous version did.
 */
export function loadModules<T>(
	pattern: string,
	validate: (mod: unknown, file: string) => T,
	logger: Logger,
): LoadResult<T>[] {
	const files = discover(pattern);
	const loaded: LoadResult<T>[] = [];

	for (const file of files) {
		try {
			// The one sanctioned dynamic require: this is the plugin-style discovery
			// that lets commands and events be files on disk rather than a manifest.

			const raw: unknown = require(file);
			const candidate = extractDefault(raw);
			loaded.push({ module: validate(candidate, file), file });
		} catch (error) {
			logger.error({ file, err: error }, "Failed to load module");
			throw new ModuleLoadError(file, error);
		}
	}

	logger.debug({ pattern, count: loaded.length }, "Loaded modules");
	return loaded;
}

function extractDefault(raw: unknown): unknown {
	if (typeof raw === "object" && raw !== null && "default" in raw) {
		return raw.default;
	}
	return raw;
}
