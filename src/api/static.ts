import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { type Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { signedInOwner } from "@api/middleware/session";

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
	".webmanifest": "application/manifest+json; charset=utf-8",
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

/**
 * The owner console's chunk, which Vite names after the lazily imported `OwnerPage`; checked on the resolved file, so
 * no spelling of the address reaches it.
 */
export function isOwnerChunk(root: string, asset: string): boolean {
	return (
		relative(root, dirname(asset)) === "assets" && /^OwnerPage-[\w-]+\.(?:js|css)(?:\.map)?$/.test(basename(asset))
	);
}

export function serveDashboard(app: Hono<ApiBindings>, root = dashboardRoot()): void {
	if (!dashboardBuilt(root)) return;

	const index = readFileSync(join(root, "index.html"), "utf8");

	app.get("*", async (context) => {
		if (context.req.path.startsWith("/api/")) return context.notFound();

		const asset = resolveAsset(root, context.req.path);

		// Answered like any missing file, so somebody else learns neither that it exists nor what the console holds.
		if (asset !== null && isOwnerChunk(root, asset)) {
			if (!(await signedInOwner(context))) return context.notFound();
			// Private and never stored, or a cache in front of the bot could hand the owner's copy to anybody.
			context.header("Cache-Control", "private, no-store");
			context.header("Vary", "Cookie");
			context.header("Content-Type", TYPES[extname(asset)] ?? "application/octet-stream");
			return context.body(new Uint8Array(readFileSync(asset)));
		}

		if (asset !== null) {
			// Only Vite's hashed names can be cached for a year; an icon keeps its name when its picture changes.
			context.header(
				"Cache-Control",
				context.req.path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=86400",
			);
			context.header("Content-Type", TYPES[extname(asset)] ?? "application/octet-stream");

			return context.body(new Uint8Array(readFileSync(asset)));
		}

		// A missing file is a 404: answering `/favicon.ico` with the page hands a home-screen icon an HTML document.
		if (extname(context.req.path) !== "") return context.notFound();

		// Anything else is a client route: React Router takes it from here.
		context.header("Cache-Control", "no-cache");
		return context.html(index);
	});
}
