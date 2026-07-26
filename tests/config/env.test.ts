import { loadEnv, resetEnv } from "../../src/config/env";

const VALID = {
	DISCORD_TOKEN: "a-token",
	DISCORD_CLIENT_ID: "123456789012345678",
	DISCORD_OWNER_IDS: "111111111111111111",
	MONGODB_URI: "mongodb://localhost/testify",
};

function setEnv(values: Record<string, string | undefined>): void {
	for (const key of Object.keys(process.env)) {
		if (key.startsWith("DISCORD_") || key.startsWith("CHANNEL_") || key === "MONGODB_URI") delete process.env[key];
	}
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined) process.env[key] = value;
	}
	resetEnv();
}

describe("loadEnv", () => {
	const original = { ...process.env };

	afterEach(() => {
		process.env = { ...original };
		resetEnv();
	});

	it("accepts the four required settings", () => {
		setEnv(VALID);
		const env = loadEnv();

		expect(env.DISCORD_TOKEN).toBe("a-token");
		expect(env.DISCORD_OWNER_IDS).toEqual(["111111111111111111"]);
		expect(env.LOG_LEVEL).toBe("info");
	});

	it("splits several owner IDs", () => {
		setEnv({ ...VALID, DISCORD_OWNER_IDS: "111111111111111111, 222222222222222222" });
		expect(loadEnv().DISCORD_OWNER_IDS).toEqual(["111111111111111111", "222222222222222222"]);
	});

	it("names every missing setting at once", () => {
		setEnv({ DISCORD_TOKEN: "a-token" });
		expect(() => loadEnv()).toThrow(/DISCORD_CLIENT_ID[\s\S]*MONGODB_URI/);
	});

	it("rejects an ID that is not a Discord snowflake", () => {
		setEnv({ ...VALID, DISCORD_CLIENT_ID: "nope" });
		expect(() => loadEnv()).toThrow(/DISCORD_CLIENT_ID/);
	});

	it("caches, so the file is read once", () => {
		setEnv(VALID);
		expect(loadEnv()).toBe(loadEnv());
	});
});
