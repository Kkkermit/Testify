import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { type Hono } from "hono";
import { type ApiBindings } from "@api/context";

/** Serves the built SPA from the API's own origin, so cookies work with no CORS and one URL sits behind a proxy. */

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
};

/** Two levels above `__dirname` in both `src/api` and `dist/api`, never the working directory. */
export function dashboardRoot(): string {
	return resolve(__dirname, "..", "..", "dashboard", "dist");
}

export function dashboardBuilt(root = dashboardRoot()): boolean {
	return existsSync(join(root, "index.html"));
}

/**
 * Refuses anything that resolves outside the build directory; the check is on the resolved path, because `..%2f`
 * survives one decode.
 */
export function resolveAsset(root: string, pathname: string): string | null {
	const decoded = safeDecode(pathname);
	if (decoded === null) return null;

	const candidate = resolve(root, `.${normalize(decoded)}`);

	// `relative` rather than a string prefix, since the separator is `\` on Windows.
	const inside = relative(root, candidate);
	if (inside.startsWith("..") || isAbsolute(inside)) return null;

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
