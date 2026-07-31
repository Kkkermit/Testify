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
