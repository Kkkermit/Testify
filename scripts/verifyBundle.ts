import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Fails if the built dashboard carries more than one copy of React.
 *
 *   npm run verify:bundle
 *
 * `discord-html-transcripts` depends on React 18, which npm hoists to the root and leaves the dashboard's React
 * 19 nested, so anything hoisted beside it — react-query, react-router — binds to the wrong copy. The page then
 * mounts against one React while its hooks read another's null dispatcher, and every screen is blank. Nothing
 * else catches it: it type-checks, it lints, and the tests pin React themselves.
 */

const ASSETS = resolve(process.cwd(), "dashboard", "dist", "assets");

/** React writes its own version into its bundle, once per copy. */
const VERSION = /version\s*[=:]\s*[`"']([\d]+\.[\d]+\.[\d]+)[`"']/g;

export function reactVersionsIn(code: string): string[] {
	const found = [...code.matchAll(VERSION)].map(([, version]) => version).filter((v) => v !== undefined);
	return [...new Set(found)].sort();
}

function main(): void {
	if (!existsSync(ASSETS)) {
		console.error(`No build to check at ${ASSETS}. Run npm run build first.`);
		process.exit(1);
	}

	const code = readdirSync(ASSETS)
		.filter((file) => file.endsWith(".js"))
		.map((file) => readFileSync(join(ASSETS, file), "utf8"))
		.join("\n");

	const versions = reactVersionsIn(code);

	if (versions.length > 1) {
		console.error(`The dashboard bundles ${String(versions.length)} copies of React: ${versions.join(", ")}.`);
		console.error("Check resolve.dedupe and the react aliases in dashboard/vite.config.ts.");
		process.exit(1);
	}

	console.log(`One copy of React in the bundle: ${versions[0] ?? "none found"}`);
}

if (require.main === module) main();
