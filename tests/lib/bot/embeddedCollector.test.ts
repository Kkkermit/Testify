import { join } from "node:path";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { repoRoot } from "@core/paths";
import {
	EMBEDDED_PORT,
	embeddedDataDir,
	embeddedPort,
	isAuditKey,
	startAdvice,
	startEmbedded,
} from "@lib/bot/embeddedCollector.util";

const collector = {
	url: "http://127.0.0.1:8080",
	dashboardUrl: "http://localhost:8080",
	ingestKey: `slk_ingest_${"i".repeat(43)}`,
	readKey: `slk_read_${"r".repeat(43)}`,
	activityKey: `slk_activity_${"a".repeat(43)}`,
	close: jest.fn(() => Promise.resolve()),
};
let mockStart: (options: unknown) => Promise<typeof collector> = () => Promise.resolve(collector);
jest.mock("@shardlens/collector/embedded", () => ({
	startEmbeddedCollector: jest.fn((options: unknown) => mockStart(options)),
}));

const AUDIT_KEY = Buffer.alloc(32, 7).toString("base64");

function clientWith(settings: Partial<Env>): { client: TestifyClient; warned: unknown[][] } {
	const warned: unknown[][] = [];
	const env = { NODE_ENV: "test", DISCORD_CLIENT_ID: "123456789012345678", ...settings };
	const logger = { warn: jest.fn((...args: unknown[]) => warned.push(args)) };
	return { client: { env, logger } as unknown as TestifyClient, warned };
}

async function startedWith(settings: Partial<Env>): Promise<{ options: unknown; warned: unknown[][] }> {
	let options: unknown;
	mockStart = (given) => {
		options = given;
		return Promise.resolve(collector);
	};
	const { client, warned } = clientWith(settings);
	await startEmbedded(client);
	return { options, warned };
}

afterEach(() => {
	mockStart = () => Promise.resolve(collector);
});

describe("startEmbedded", () => {
	it("points the bot at the collector it started, with its generated keys", async () => {
		const { client } = clientWith({});

		expect(await startEmbedded(client)).toEqual({
			url: collector.url,
			ingestKey: collector.ingestKey,
			readKey: collector.readKey,
			activityKey: collector.activityKey,
			embedded: { dashboardUrl: collector.dashboardUrl, close: expect.any(Function) as unknown },
		});
	});

	/** Who ran what needs the audit key, kept in the bot's settings rather than beside the data it decrypts. */
	it("asks for audit mode only with an audit key the collector can use", async () => {
		const base = { dataDir: embeddedDataDir({ NODE_ENV: "test" }), appId: "123456789012345678", port: 8080 };

		const plain = await startedWith({});
		expect(plain.options).toEqual(base);

		const audited = await startedWith({ SHARDLENS_AUDIT_KEY: AUDIT_KEY });
		expect(audited.options).toEqual({ ...base, mode: "audit", auditKey: AUDIT_KEY });

		const wrong = await startedWith({ SHARDLENS_AUDIT_KEY: "short", SHARDLENS_EMBEDDED_PORT: "80800" });
		expect(wrong.options).toEqual(base);
		expect(wrong.warned.map(([message]) => message)).toEqual([
			"[SHARDLENS] SHARDLENS_EMBEDDED_PORT is not a port, so the collector uses 8080.",
			"[SHARDLENS] SHARDLENS_AUDIT_KEY is not 32 random bytes in base64 (openssl rand -base64 32), so who ran what stays off.",
		]);
		expect(JSON.stringify(wrong.warned)).not.toContain("short");
	});

	/** A collector that cannot start is a warning naming the fix, and the bot carries on without analytics. */
	it("answers null and says what to change when the collector cannot start", async () => {
		mockStart = () => Promise.reject(Object.assign(new Error("listen EADDRINUSE"), { code: "EADDRINUSE" }));
		const { client, warned } = clientWith({ SHARDLENS_EMBEDDED_PORT: "9090" });

		expect(await startEmbedded(client)).toBeNull();
		expect(warned[0]?.[1]).toBe(
			"[SHARDLENS] The collector inside the bot could not start, so analytics are off until the next start. Port 9090 is in use: set SHARDLENS_EMBEDDED_PORT to a free one.",
		);
	});
});

describe("the collector's settings", () => {
	/** A development and a production bot on one machine sharing a database would mix two applications' figures. */
	it("keeps each NODE_ENV's database in its own folder under the repository", () => {
		expect(embeddedDataDir({ NODE_ENV: "development" })).toBe(join(repoRoot(), "shardlens-data", "development"));
		expect(embeddedDataDir({ NODE_ENV: "production" })).not.toBe(embeddedDataDir({ NODE_ENV: "development" }));
	});

	it("reads a port, an audit key and the failures with a fix", () => {
		const wrong = [
			[embeddedPort(undefined), EMBEDDED_PORT],
			[embeddedPort("9090"), 9090],
			[embeddedPort("0"), null],
			[embeddedPort("65536"), null],
			[embeddedPort("80 80"), null],
			[isAuditKey(AUDIT_KEY), true],
			[isAuditKey(Buffer.alloc(31).toString("base64")), false],
			[startAdvice(Object.assign(new Error(), { code: "EACCES" }), 1, "/data")?.includes("/data"), true],
			[startAdvice(new Error("anything else"), 1, "/data"), null],
		].filter(([got, want]) => got !== want);

		expect(wrong).toEqual([]);
	});
});
