import { loadEnv, REQUIRED_ENV_KEYS, resetEnvCache } from "../../src/config/env";

const BASE = {
	DISCORD_TOKEN: "a-token",
	DISCORD_CLIENT_ID: "123456789012345678",
	DISCORD_OWNER_IDS: "111111111111111111",
	MONGODB_URI: "mongodb://localhost/testify",
};

function withEnv(values: Record<string, string | undefined>): void {
	for (const key of Object.keys(process.env)) {
		if (
			key.startsWith("DISCORD_") ||
			key.startsWith("SPOTIFY_") ||
			key.startsWith("CHANNEL_") ||
			key.startsWith("WEBHOOK_")
		) {
			delete process.env[key];
		}
	}
	delete process.env.MONGODB_URI;
	delete process.env.TOKEN_ENCRYPTION_KEY;
	delete process.env.OAUTH_STATE_SECRET;

	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	resetEnvCache();
}

describe("loadEnv", () => {
	const original = { ...process.env };

	afterEach(() => {
		process.env = { ...original };
		resetEnvCache();
	});

	it("accepts a minimal valid environment", () => {
		withEnv(BASE);
		const env = loadEnv();

		expect(env.DISCORD_TOKEN).toBe("a-token");
		expect(env.DISCORD_OWNER_IDS).toEqual(["111111111111111111"]);
		expect(env.OAUTH_PORT).toBe(3000);
	});

	// The previous boot failed deep inside a command rather than at startup.
	it("names every missing required variable at once", () => {
		withEnv({});

		try {
			loadEnv();
			throw new Error("expected loadEnv to throw");
		} catch (error) {
			const message = (error as Error).message;
			for (const key of REQUIRED_ENV_KEYS) expect(message).toContain(key);
		}
	});

	it("splits and validates a list of owner ids", () => {
		withEnv({ ...BASE, DISCORD_OWNER_IDS: "111111111111111111, 222222222222222222" });
		expect(loadEnv().DISCORD_OWNER_IDS).toHaveLength(2);
	});

	it("rejects an owner id that is not a snowflake", () => {
		withEnv({ ...BASE, DISCORD_OWNER_IDS: "not-an-id" });
		expect(() => loadEnv()).toThrow(/DISCORD_OWNER_IDS/);
	});

	it("rejects a client id that is not a snowflake", () => {
		withEnv({ ...BASE, DISCORD_CLIENT_ID: "123" });
		expect(() => loadEnv()).toThrow(/DISCORD_CLIENT_ID/);
	});

	it("rejects a webhook value that is not a url", () => {
		withEnv({ ...BASE, WEBHOOK_BUG_REPORTS: "not-a-url" });
		expect(() => loadEnv()).toThrow(/WEBHOOK_BUG_REPORTS/);
	});

	it("rejects an encryption key that is not 32 hex bytes", () => {
		withEnv({ ...BASE, TOKEN_ENCRYPTION_KEY: "abc" });
		expect(() => loadEnv()).toThrow(/TOKEN_ENCRYPTION_KEY/);
	});

	it("accepts a valid encryption key", () => {
		withEnv({ ...BASE, TOKEN_ENCRYPTION_KEY: "a".repeat(64) });
		expect(loadEnv().TOKEN_ENCRYPTION_KEY).toHaveLength(64);
	});

	it("memoises the parsed environment", () => {
		withEnv(BASE);
		expect(loadEnv()).toBe(loadEnv());
	});
});
