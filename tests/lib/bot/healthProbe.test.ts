import { healthUrl, isHealthy } from "@lib/bot/healthProbe.util";

const on = { SITE_ENABLED: true, DASHBOARD_ENABLED: false, DASHBOARD_PORT: 3000, DASHBOARD_BIND: "0.0.0.0" };

/** Docker probes from inside the container, so a listener bound everywhere is asked on its own loopback. */
it("asks the container's own listener, and nothing when none is open", () => {
	expect([
		healthUrl(on),
		healthUrl({ ...on, DASHBOARD_BIND: "127.0.0.1", DASHBOARD_PORT: 8080 }),
		healthUrl({ ...on, DASHBOARD_BIND: "::1" }),
		healthUrl({ ...on, SITE_ENABLED: false, DASHBOARD_ENABLED: true }),
		healthUrl({ ...on, SITE_ENABLED: false }),
	]).toEqual([
		"http://127.0.0.1:3000/api/health",
		"http://127.0.0.1:8080/api/health",
		"http://[::1]:3000/api/health",
		"http://127.0.0.1:3000/api/health",
		null,
	]);
});

/** A bot still connecting to Discord answers the route, so only `ok` says it is serving anybody. */
it("is healthy only when the route says it is ready", () => {
	expect([
		isHealthy({ ok: true, discord: "ready" }),
		isHealthy({ ok: false, discord: "connecting" }),
		isHealthy("ok"),
		isHealthy(null),
	]).toEqual([true, false, false, false]);
});
