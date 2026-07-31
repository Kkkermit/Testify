import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { type Hono } from "hono";
import { type ApiBindings } from "@api/context";

/**
 * Serves the built SPA from the same origin as the API in production, which is what makes cookies work with no
 * CORS, no `SameSite=None` and one URL to put behind a reverse proxy.
 */

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
};

/**
 * `__dirname` is `src/api` while developing and `dist/api` after a build, and both sit two levels under the
 * repository root — so this finds `dashboard/dist` either way, and never the working directory, which a start
 * script can change.
 */
export function dashboardRoot(): string {
	return resolve(__dirname, "..", "..", "dashboard", "dist");
}

export function dashboardBuilt(root = dashboardRoot()): boolean {
	return existsSync(join(root, "index.html"));
}

/**
 * Refuses anything that escapes the build directory. `..%2f` survives one decode, so the check is on the
 * resolved path rather than on the text of the request.
 */
export function resolveAsset(root: string, pathname: string): string | null {
	const decoded = safeDecode(pathname);
	if (decoded === null) return null;

	const candidate = resolve(root, `.${normalize(decoded)}`);
	if (!candidate.startsWith(`${root}/`) && candidate !== root) return null;

	return existsSync(candidate) && extname(candidate) !== "" ? candidate : null;
}

function safeDecode(pathname: string): string | null {
	try {
		return decodeURIComponent(pathname);
	} catch {
		return null;
	}
}

export function serveDashboard(app: Hono<ApiBindings>, root = dashboardRoot()): void {
	if (!dashboardBuilt(root)) return;

	const index = readFileSync(join(root, "index.html"), "utf8");

	app.get("*", (context) => {
		if (context.req.path.startsWith("/api/")) return context.notFound();

		const asset = resolveAsset(root, context.req.path);

		if (asset !== null) {
			// Vite hashes asset filenames, so a year is safe and index.html must never be cached.
			context.header("Cache-Control", "public, max-age=31536000, immutable");
			context.header("Content-Type", TYPES[extname(asset)] ?? "application/octet-stream");

			return context.body(new Uint8Array(readFileSync(asset)));
		}

		// Anything else is a client route: React Router takes it from here.
		context.header("Cache-Control", "no-cache");
		return context.html(index);
	});
}
