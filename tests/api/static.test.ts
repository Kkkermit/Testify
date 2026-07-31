import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { dashboardBuilt, dashboardRoot, resolveAsset, serveDashboard } from "@api/static";

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "testify-dash-"));
	mkdirSync(join(root, "assets"));
	writeFileSync(join(root, "index.html"), "<!doctype html><div id=root></div>");
	writeFileSync(join(root, "assets", "index-abc123.js"), "console.log(1)");
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("dashboardRoot", () => {
	/**
	 * It once resolved through the assets directory, which lands inside `dist/` after a build — so the built bot
	 * looked for `dist/dashboard/dist`, found nothing, and served a 404 for every page. Nothing caught it but a
	 * real request.
	 */
	it("points outside the bot's own build output", () => {
		const root = dashboardRoot();

		expect(root.endsWith(join("dashboard", "dist"))).toBe(true);
		expect(root).not.toContain(`${sep}dist${sep}dashboard`);
	});
});

describe("resolveAsset", () => {
	it("finds a built file", () => {
		expect(resolveAsset(root, "/assets/index-abc123.js")).toBe(join(root, "assets", "index-abc123.js"));
	});

	/**
	 * The check is on the resolved path rather than on the text of the request, because `..%2f` survives one
	 * decode and a string check on the raw path would let it through.
	 */
	it("refuses anything that climbs out of the build directory", () => {
		for (const path of ["/../.env", "/..%2f.env", "/assets/../../.env", "/%2e%2e/%2e%2e/.env"]) {
			expect(resolveAsset(root, path)).toBeNull();
		}
	});

	it("refuses a path it cannot decode", () => {
		expect(resolveAsset(root, "/%")).toBeNull();
	});

	it("returns nothing for a file that is not there", () => {
		expect(resolveAsset(root, "/assets/nope.js")).toBeNull();
	});

	/** A client route has no extension, and must fall through to index.html rather than 404. */
	it("does not treat an extensionless path as an asset", () => {
		expect(resolveAsset(root, "/guilds/900000000000000001")).toBeNull();
	});
});

describe("serveDashboard", () => {
	function appFor(): Hono<ApiBindings> {
		const app = new Hono<ApiBindings>();
		app.get("/api/health", (context) => context.json({ ok: true }));
		serveDashboard(app, root);

		return app;
	}

	it("serves a hashed asset with a long cache", async () => {
		const response = await appFor().request("/assets/index-abc123.js");

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toContain("immutable");
		expect(response.headers.get("content-type")).toContain("text/javascript");
	});

	/** React Router owns every path the API does not, which is what makes a deep link work on a hard refresh. */
	it("hands an unknown path to the SPA, uncached", async () => {
		const response = await appFor().request("/guilds/900000000000000001/levelling");

		expect(response.status).toBe(200);
		expect(await response.text()).toContain("id=root");
		expect(response.headers.get("cache-control")).toBe("no-cache");
	});

	/** Otherwise a typo in an API path silently returns HTML and the client parses it as JSON. */
	it("never answers an /api path with the SPA", async () => {
		expect((await appFor().request("/api/nope")).status).toBe(404);
	});

	it("leaves the real API routes alone", async () => {
		expect((await appFor().request("/api/health")).status).toBe(200);
	});

	/** A bot-only install has never run the dashboard build, and must not crash on start. */
	it("registers nothing when the dashboard has not been built", async () => {
		rmSync(join(root, "index.html"));
		expect(dashboardBuilt(root)).toBe(false);

		const app = new Hono<ApiBindings>();
		serveDashboard(app, root);

		expect((await app.request("/guilds")).status).toBe(404);
	});
});
