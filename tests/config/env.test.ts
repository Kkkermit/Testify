import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, resetEnv } from "@config/env";

const VALID = {
	DISCORD_TOKEN: "a-token",
	DISCORD_CLIENT_ID: "123456789012345678",
	DISCORD_OWNER_IDS: "111111111111111111",
	MONGODB_URI: "mongodb://localhost/testify",
};

function setEnv(values: Record<string, string | undefined>): void {
	for (const key of Object.keys(process.env)) {
		const owned = ["DISCORD_", "CHANNEL_", "DASHBOARD_"].some((prefix) => key.startsWith(prefix));
		if (owned || key === "MONGODB_URI") delete process.env[key];
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

	/** `.env.example` ships every optional key present but blank, which is an empty string rather than an absent one. */
	it("treats a blank optional setting as unset", () => {
		setEnv({
			...VALID,
			DISCORD_DEV_GUILD_ID: "",
			LOG_LEVEL: "",
			CHANNEL_ERROR_LOG: "",
			CHANNEL_GUILD_LOG: "",
			CHANNEL_DM_LOG: "",
			CHANNEL_FEEDBACK_LOG: "",
		});

		const env = loadEnv();

		expect(env.DISCORD_DEV_GUILD_ID).toBeUndefined();
		expect(env.CHANNEL_ERROR_LOG).toBeUndefined();
		expect(env.LOG_LEVEL).toBe("info");
	});

	it("counts whitespace as blank too", () => {
		setEnv({ ...VALID, DISCORD_DEV_GUILD_ID: "   " });
		expect(loadEnv().DISCORD_DEV_GUILD_ID).toBeUndefined();
	});

	it("still rejects an optional setting filled in wrongly", () => {
		setEnv({ ...VALID, DISCORD_DEV_GUILD_ID: "not-an-id" });
		expect(() => loadEnv()).toThrow(/DISCORD_DEV_GUILD_ID/);
	});

	it("still rejects a required setting left blank", () => {
		setEnv({ ...VALID, DISCORD_TOKEN: "" });
		expect(() => loadEnv()).toThrow(/DISCORD_TOKEN/);
	});

	it("caches, so the file is read once", () => {
		setEnv(VALID);
		expect(loadEnv()).toBe(loadEnv());
	});
});

describe("the dashboard settings", () => {
	const original = { ...process.env };

	afterEach(() => {
		process.env = { ...original };
		resetEnv();
	});

	it("is off unless it is asked for, so a bot-only install needs none of the rest", () => {
		setEnv(VALID);
		const env = loadEnv();

		expect(env.DASHBOARD_ENABLED).toBe(false);
		expect(env.DISCORD_CLIENT_SECRET).toBeUndefined();
	});

	/**
	 * Binding to every interface would put an admin panel on the open internet on a VPS, and trusting
	 * `x-forwarded-for` with no proxy in front lets anyone forge their address.
	 */
	it("defaults to the safe side of both choices that are silent when wrong", () => {
		setEnv(VALID);
		const env = loadEnv();

		expect(env.DASHBOARD_BIND).toBe("127.0.0.1");
		expect(env.DASHBOARD_TRUST_PROXY).toBe(false);
	});

	/** `z.coerce.boolean()` reads the string "false" as true, which would turn the switch into an on switch. */
	it("reads the word false as false", () => {
		setEnv({ ...VALID, DASHBOARD_ENABLED: "false", DASHBOARD_TRUST_PROXY: "false" });
		const env = loadEnv();

		expect(env.DASHBOARD_ENABLED).toBe(false);
		expect(env.DASHBOARD_TRUST_PROXY).toBe(false);
	});

	it("names all three missing secrets at once rather than one per attempt", () => {
		setEnv({ ...VALID, DASHBOARD_ENABLED: "true" });

		expect(() => loadEnv()).toThrow(/DISCORD_CLIENT_SECRET[\s\S]*DASHBOARD_BASE_URL[\s\S]*DASHBOARD_SESSION_SECRET/);
	});

	/** A short secret is a guessable key for the OAuth tokens it encrypts. */
	it("refuses a session secret too short to be a key", () => {
		setEnv({
			...VALID,
			DASHBOARD_ENABLED: "true",
			DISCORD_CLIENT_SECRET: "a-secret",
			DASHBOARD_BASE_URL: "https://dash.example.com",
			DASHBOARD_SESSION_SECRET: "tooshort",
		});

		expect(() => loadEnv()).toThrow(/DASHBOARD_SESSION_SECRET/);
	});

	it("accepts a complete dashboard configuration", () => {
		setEnv({
			...VALID,
			DASHBOARD_ENABLED: "true",
			DISCORD_CLIENT_SECRET: "a-secret",
			DASHBOARD_BASE_URL: "https://dash.example.com",
			DASHBOARD_SESSION_SECRET: "a".repeat(32),
		});

		expect(loadEnv().DASHBOARD_ENABLED).toBe(true);
	});
});

/**
 * The dev/prod split is only as good as the script that triggers it: `loadEnv()` picks `.env.development` off
 * `NODE_ENV`, so a `dev` script that forgets to set it starts the production bot against the production database.
 */
describe("the dev script", () => {
	const { scripts } = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8")) as {
		scripts: Record<string, string>;
	};

	it("sets NODE_ENV=development, so npm run dev reads .env.development", () => {
		expect(scripts.dev).toMatch(/NODE_ENV=development/);
	});

	it("does not set NODE_ENV=development anywhere in start, which must read .env", () => {
		expect(scripts.start).not.toMatch(/NODE_ENV=development/);
	});
});
