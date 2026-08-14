import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Fails on the two things that only go wrong in the built dashboard.
 *
 *   npm run verify:bundle
 *
 * **More than one copy of React.** `discord-html-transcripts` depends on React 18, which npm hoists to the root
 * and leaves the dashboard's React 19 nested, so anything hoisted beside it — react-query, react-router — binds
 * to the wrong copy. The page then mounts against one React while its hooks read another's null dispatcher, and
 * every screen is blank. Nothing else catches it: it type-checks, it lints, and the tests pin React themselves.
 *
 * **A polyfilled `light-dark()`.** Below the `cssTarget` in `dashboard/vite.config.ts`, Lightning CSS rewrites
 * the function into a pair of variables flipped by `color-scheme` — and because a custom property is
 * substituted where it is declared, every token then resolves against `:root`. Two things break silently and
 * only in a build: a nested `color-scheme` stops working, so the theme samples all render in the page's own
 * theme, and `pickScheme` can no longer read a token, so the WebGL backdrop falls back to one hardcoded colour.
 */

const ASSETS = resolve(process.cwd(), "dashboard", "dist", "assets");

/** React writes its own version into its bundle, once per copy. */
const VERSION = /version\s*[=:]\s*[`"']([\d]+\.[\d]+\.[\d]+)[`"']/g;

/**
 * Identifiers React ships beside that version and nothing else does.
 *
 * The bare pattern matches any package that exports a semver string — `dompurify` writes `t.version = "3.4.13"`
 * next to `t.removed = []` — and one of those reported as a second React is a build failure with no bug behind
 * it. Minified names change every release; these are export names and payload keys, which do not.
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

	console.log(`One copy of React in the bundle: ${versions[0] ?? "none found"}`);
	console.log("`light-dark()` reaches the browser intact.");
}

if (require.main === module) main();
