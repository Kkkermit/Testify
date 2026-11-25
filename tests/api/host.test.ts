import { servesHost } from "@api/middleware/host";
import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { API_ENV } from "@tests/helpers/apiHarness";
import { createMockClient } from "@tests/helpers/mocks";

const ENV = { DASHBOARD_BASE_URL: "https://dash.example.com", DASHBOARD_BIND: "127.0.0.1" } as Env;

/** A page on a domain somebody pointed at this machine reads it as its own origin, which is DNS rebinding. */
it("answers its own name and the names a proxy or this machine use, and no other public name", () => {
	const cases: [string, boolean][] = [
		["dash.example.com", true],
		["DASH.example.com", true],
		["dash.example.com.", true],
		["localhost", true],
		["app.localhost", true],
		["127.0.0.1", true],
		["192.168.1.20", true],
		["[::1]", true],
		["testify", true],
		["bot.internal", true],
		["nas.local", true],
		["evil.example", false],
		["evil.example.", false],
		["localhost.evil.example", false],
		["dash.example.com.evil.example", false],
		["example.com", false],
	];

	const wrong = cases.filter(([host, served]) => servesHost(host, ENV) !== served);

	expect(wrong).toEqual([]);
	expect(servesHost("evil.example", { DASHBOARD_BIND: "127.0.0.1" })).toBe(true);
});

describe("the app", () => {
	const client = createMockClient();
	const app = createApi(client, { ...API_ENV, DASHBOARD_BASE_URL: "https://dash.example.com" });

	it("refuses a request addressed to another public name, and names it in the log once", async () => {
		const warn = jest.spyOn(client.logger, "warn");
		const first = await app.request("http://evil.example/api/site");
		await app.request("http://evil.example/api/bot");

		expect(first.status).toBe(421);
		expect(((await first.json()) as { error: { code: string } }).error.code).toBe("unknown_host");
		expect(first.headers.get("x-frame-options")).toBe("DENY");
		expect(warn).toHaveBeenCalledTimes(1);
	});

	/** A host's own health check asks by whatever name reaches the port. */
	it("still answers its own name, and the health check under any", async () => {
		expect((await app.request("https://dash.example.com/api/site")).status).not.toBe(421);
		expect((await app.request("http://evil.example/api/health")).status).not.toBe(421);
	});
});
