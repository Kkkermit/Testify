import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { serveDashboard } from "@api/static";

/**
 * The real files, over a stub index.html. Pointing this at `dashboard/dist` instead passed only on a machine
 * that had just run the build: CI's test job never does, so `serveDashboard` registered no routes at all and
 * every request 404'd.
 */
const PUBLIC = resolve(__dirname, "../..", "dashboard/public");

let root: string;
let app: Hono<ApiBindings>;

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "testify-wellknown-"));
	cpSync(join(PUBLIC, ".well-known"), join(root, ".well-known"), { recursive: true });
	cpSync(join(PUBLIC, "robots.txt"), join(root, "robots.txt"));
	writeFileSync(join(root, "index.html"), "<!doctype html><div id=root></div>");

	app = new Hono<ApiBindings>();
	serveDashboard(app, root);
});

afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("well-known paths", () => {
	/**
	 * A leading dot segment is exactly what `normalize` folds away, and folding this one hands the security
	 * contact to the SPA catch-all instead: a 200 carrying HTML, which every scanner reads as the file being
	 * absent.
	 */
	it.each(["/.well-known/security.txt", "/robots.txt"])("serves %s as a file, not the SPA shell", async (path) => {
		const response = await app.request(path);
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(body).not.toContain("<!doctype html>");
	});

	it("serves the real security.txt rather than an empty one", async () => {
		expect(await (await app.request("/.well-known/security.txt")).text()).toContain("Contact:");
	});
});
