import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { serveDashboard } from "@api/static";

describe("well-known paths", () => {
	const app = new Hono<ApiBindings>();
	serveDashboard(app);

	it.each(["/.well-known/security.txt", "/robots.txt"])("serves %s as a file, not the SPA shell", async (path) => {
		const response = await app.request(path);
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		expect(body).not.toContain("<!doctype html>");
	});

	it("security.txt carries a Contact line", async () => {
		expect(await (await app.request("/.well-known/security.txt")).text()).toContain("Contact:");
	});
});
