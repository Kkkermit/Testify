import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, posix, relative, resolve, sep } from "node:path";
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

/** Every file in the build by its exact path, with `/` between folders whatever the platform. */
export function builtFiles(root: string): Set<string> {
	return new Set(
		readdirSync(root, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/")),
	);
}

/**
 * Only a path naming a built file exactly, so nothing outside the build is reachable and no name a filesystem folds
 * together — another case, a trailing dot, a stream — slips a file past the owner and source map checks.
 */
export function resolveAsset(root: string, pathname: string, files = builtFiles(root)): string | null {
	const decoded = safeDecode(pathname);
	if (decoded === null) return null;

	const wanted = posix.normalize(decoded).replace(/^\/+/, "");
	return files.has(wanted) && extname(wanted) !== "" ? join(root, ...wanted.split("/")) : null;
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
	return relative(root, dirname(asset)) === "assets" && /^OwnerPage-[\w-]+\.(?:js|css)$/.test(basename(asset));
}

export function serveDashboard(app: Hono<ApiBindings>, root = dashboardRoot()): void {
	if (!dashboardBuilt(root)) return;

	const index = readFileSync(join(root, "index.html"), "utf8");
	const files = builtFiles(root);

	app.get("*", async (context) => {
		if (context.req.path.startsWith("/api/")) return context.notFound();

		const asset = resolveAsset(root, context.req.path, files);

		// A source map rebuilds the code it describes, so one left in a build is never handed out, however it is spelt.
		if (asset !== null && extname(asset) === ".map") return context.notFound();

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

		// A missing file is a 404: answering `/favicon.ico` with the page hands a home-screen icon an HTML document. The
		// source browser's addresses are the repository's own paths, so a `.ts` under it is a page rather than an asset.
		if (extname(context.req.path) !== "" && !context.req.path.startsWith("/source-code/")) return context.notFound();

		// Anything else is a client route: React Router takes it from here.
		context.header("Cache-Control", "no-cache");
		return context.html(index);
	});
}
