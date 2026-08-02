import { readDashboardEnv, timeoutMs } from "../../scripts/waitForApi";

describe("readDashboardEnv", () => {
	/** `flag` in env.ts reads only the literal string, so anything else is off — and off means no API to wait for. */
	it("treats anything but the literal true as off", () => {
		expect(readDashboardEnv({ DASHBOARD_ENABLED: "true" }).enabled).toBe(true);
		expect(readDashboardEnv({ DASHBOARD_ENABLED: "1" }).enabled).toBe(false);
		expect(readDashboardEnv({}).enabled).toBe(false);
	});

	it("reads the port the bot will actually listen on", () => {
		expect(readDashboardEnv({ DASHBOARD_PORT: "4100" }).port).toBe(4_100);
	});

	/**
	 * The same 3000 `env.ts` defaults to. This script running against a different port than the bot would wait
	 * forever on a bot that came up perfectly.
	 */
	it("falls back to 3000 when the port is absent or unusable", () => {
		expect(readDashboardEnv({}).port).toBe(3_000);
		expect(readDashboardEnv({ DASHBOARD_PORT: "" }).port).toBe(3_000);
		expect(readDashboardEnv({ DASHBOARD_PORT: "not a port" }).port).toBe(3_000);
		expect(readDashboardEnv({ DASHBOARD_PORT: "0" }).port).toBe(3_000);
		expect(readDashboardEnv({ DASHBOARD_PORT: "70000" }).port).toBe(3_000);
	});
});

describe("timeoutMs", () => {
	it("uses the default when no flag is given", () => {
		expect(timeoutMs([])).toBe(180_000);
	});

	it("takes the value after --timeout", () => {
		expect(timeoutMs(["--timeout", "2500"])).toBe(2_500);
	});

	/** A malformed flag falling through to zero would make the script give up before it polled once. */
	it("ignores a flag with nothing usable after it", () => {
		expect(timeoutMs(["--timeout"])).toBe(180_000);
		expect(timeoutMs(["--timeout", "soon"])).toBe(180_000);
		expect(timeoutMs(["--timeout", "-5"])).toBe(180_000);
	});
});
