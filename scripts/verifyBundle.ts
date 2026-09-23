import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Fails on what only goes wrong in the built dashboard: a second copy of React, a polyfilled `light-dark()`, or a
 * missing file from `dashboard/public`.
 */

const DIST = resolve(process.cwd(), "dashboard", "dist");
const ASSETS = join(DIST, "assets");
const PUBLIC = resolve(process.cwd(), "dashboard", "public");

/** React writes its own version into its bundle, once per copy. */
const VERSION = /version\s*[=:]\s*[`"']([\d]+\.[\d]+\.[\d]+)[`"']/g;

/**
 * Identifiers only React ships beside its version, so another package's semver string is not taken for a second React.
 */
const REACT_NEIGHBOUR =
	/useTransition|useFormStatus|useSyncExternalStore|rendererPackageName|react-dom|react\.transitional/;

/** Either side, because the DevTools descriptor names the renderer after the version rather than before it. */
const WINDOW = 220;

export function reactVersionsIn(code: string): string[] {
	const found = [...code.matchAll(VERSION)]
		.filter((match) => REACT_NEIGHBOUR.test(near(code, match.index, match[0].length)))
		.map(([, version]) => version)
		.filter((version) => version !== undefined);

	return [...new Set(found)].sort();
}

function near(code: string, index: number, length: number): string {
	return code.slice(Math.max(0, index - WINDOW), index) + code.slice(index + length, index + length + WINDOW);
}

/** The variables Lightning CSS substitutes a `light-dark()` with when it compiles the function away. */
const POLYFILLED = /--lightningcss-(?:light|dark)/;

export function schemeProblem(css: string): string | null {
	if (POLYFILLED.test(css)) return "`light-dark()` was compiled into variables rather than left to the browser.";
	if (!css.includes("light-dark(")) return "No `light-dark()` survived the build, so the palette has one theme.";

	return null;
}

/** Every file under a directory, relative to it, so adding one to `dashboard/public` is checked with no edit here. */
export function filesUnder(root: string, prefix = ""): string[] {
	if (!existsSync(root)) return [];

	return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? filesUnder(join(root, entry.name), join(prefix, entry.name)) : [join(prefix, entry.name)],
	);
}

export function missingFrom(root: string, files: readonly string[]): string[] {
	return files.filter((file) => !existsSync(join(root, file)));
}

function assetsMatching(extension: string): string {
	return readdirSync(ASSETS)
		.filter((file) => file.endsWith(extension))
		.map((file) => readFileSync(join(ASSETS, file), "utf8"))
		.join("\n");
}

function main(): void {
	if (!existsSync(ASSETS)) {
		console.error(`No build to check at ${ASSETS}. Run npm run build first.`);
		process.exit(1);
	}

	const versions = reactVersionsIn(assetsMatching(".js"));

	if (versions.length > 1) {
		console.error(`The dashboard bundles ${String(versions.length)} copies of React: ${versions.join(", ")}.`);
		console.error("Check resolve.dedupe and the react aliases in dashboard/vite.config.ts.");
		process.exit(1);
	}

	const scheme = schemeProblem(assetsMatching(".css"));

	if (scheme !== null) {
		console.error(scheme);
		console.error("Check build.cssTarget in dashboard/vite.config.ts.");
		process.exit(1);
	}

	const publicFiles = filesUnder(PUBLIC);
	const missing = missingFrom(DIST, publicFiles);

	if (missing.length > 0) {
		console.error(`The build left out ${missing.join(", ")} from dashboard/public.`);
		console.error("Check publicDir in dashboard/vite.config.ts.");
		process.exit(1);
	}

	console.log(`One copy of React in the bundle: ${versions[0] ?? "none found"}`);
	console.log("`light-dark()` reaches the browser intact.");
	console.log(`All ${String(publicFiles.length)} files from dashboard/public are in the build.`);
}

if (require.main === module) main();
