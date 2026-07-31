import { type Env } from "@config/env";
import { dashboardUrl } from "@lib/dashboard.util";

function envFor(overrides: Partial<Env> = {}): Env {
	return { DASHBOARD_ENABLED: true, DASHBOARD_BIND: "127.0.0.1", DASHBOARD_PORT: 3_000, ...overrides } as Env;
}

describe("dashboardUrl", () => {
	/** In development Vite serves the page and proxies to the API, so the bound port is not the one to open. */
	it("prefers the address a browser is pointed at over the one the API binds", () => {
		expect(dashboardUrl(envFor({ DASHBOARD_BASE_URL: "http://localhost:5174" }))).toBe("http://localhost:5174");
	});

	it("falls back to the bind address when no base URL is configured", () => {
		expect(dashboardUrl(envFor())).toBe("http://127.0.0.1:3000");
	});

	it("is null when the dashboard is switched off", () => {
		expect(dashboardUrl(envFor({ DASHBOARD_ENABLED: false }))).toBeNull();
	});
});
