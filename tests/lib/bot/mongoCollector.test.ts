import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import {
	COLLECTOR_PORT,
	collectorPort,
	isAuditKey,
	startAdvice,
	startInBotCollector,
} from "@lib/bot/mongoCollector.util";

const URI = "mongodb+srv://bot:hunter2@cluster0.example.mongodb.net/testify";
const send = jest.fn(() => Promise.resolve(new Response(null)));
const collector = {
	appId: "123456789012345678",
	fetch: send,
	dashboardUrl: "http://localhost:8080" as string | undefined,
	signInLink: () => "http://localhost:8080/auth/link/once",
	readKey: `slk_read_${"r".repeat(43)}`,
	activityKey: `slk_activity_${"a".repeat(43)}`,
	close: jest.fn(() => Promise.resolve()),
};
let mockStart: (options: unknown) => Promise<typeof collector> = () => Promise.resolve(collector);
jest.mock("@shardlens/collector/mongodb", () => ({
	startMongoCollector: jest.fn((options: unknown) => mockStart(options)),
}));

const AUDIT_KEY = Buffer.alloc(32, 7).toString("base64");

function clientWith(settings: Partial<Env>): { client: TestifyClient; warned: unknown[][] } {
	const warned: unknown[][] = [];
	const env = { NODE_ENV: "test", DISCORD_CLIENT_ID: "123456789012345678", MONGODB_URI: URI, ...settings };
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
	await startInBotCollector(client);
	return { options, warned };
}

afterEach(() => {
	mockStart = () => Promise.resolve(collector);
	collector.dashboardUrl = "http://localhost:8080";
});

describe("startInBotCollector", () => {
	/** The SDK sends through the collector in this process, and the owner console reads it on this machine alone. */
	it("points the bot at the collector it started on the bot's own MongoDB", async () => {
		const { client } = clientWith({});

		expect(await startInBotCollector(client)).toEqual({
			url: "http://127.0.0.1:8080",
			ingestKey: undefined,
			readKey: collector.readKey,
			activityKey: collector.activityKey,
			inBot: { send, close: expect.any(Function) as unknown },
		});
	});

	/** Who ran what needs the audit key, which the collector never keeps in the database it decrypts. */
	it("starts on MONGODB_URI, answers on loopback only, and asks for audit mode only with a usable key", async () => {
		const base = {
			uri: URI,
			appId: "123456789012345678",
			dashboard: { port: COLLECTOR_PORT, host: "127.0.0.1" },
		};

		const plain = await startedWith({});
		expect(plain.options).toEqual(base);

		const audited = await startedWith({ SHARDLENS_AUDIT_KEY: AUDIT_KEY, SHARDLENS_PORT: "9090" });
		expect(audited.options).toEqual({
			...base,
			dashboard: { port: 9090, host: "127.0.0.1" },
			mode: "audit",
			auditKey: AUDIT_KEY,
		});

		const wrong = await startedWith({ SHARDLENS_AUDIT_KEY: "short", SHARDLENS_PORT: "80800" });
		expect(wrong.options).toEqual(base);
		expect(wrong.warned.map(([message]) => message)).toEqual([
			"[SHARDLENS] SHARDLENS_PORT is not a port, so the collector uses 8080.",
			"[SHARDLENS] SHARDLENS_AUDIT_KEY is not 32 random bytes in base64 (openssl rand -base64 32), so who ran what stays off.",
		]);
		expect(JSON.stringify(wrong.warned)).not.toContain("short");
	});

	/** The collector listens before the website, so on the website's port it would leave the website none. */
	it("keeps off the website's port, and only while the website listens", async () => {
		const shared = await startedWith({ SITE_ENABLED: true, DASHBOARD_PORT: COLLECTOR_PORT });
		expect(shared.options).toMatchObject({ dashboard: { port: COLLECTOR_PORT + 1 } });
		expect(shared.warned.map(([message]) => message)).toEqual([
			"[SHARDLENS] Port 8080 is the website's, so the collector uses 8081. Set SHARDLENS_PORT to choose another.",
		]);

		const quiet = await startedWith({ SITE_ENABLED: false, DASHBOARD_ENABLED: false, DASHBOARD_PORT: COLLECTOR_PORT });
		expect(quiet.options).toMatchObject({ dashboard: { port: COLLECTOR_PORT } });
		expect(quiet.warned).toEqual([]);
	});

	/** Another process on the port leaves the collector storing events and the console with nothing to read. */
	it("keeps sending, reads nothing and says how to fix it when the port is taken", async () => {
		collector.dashboardUrl = undefined;
		const { client, warned } = clientWith({ SHARDLENS_PORT: "9090" });

		const target = await startInBotCollector(client);
		expect(target).toMatchObject({ url: undefined, inBot: { send } });
		expect(warned.map(([message]) => message)).toEqual([
			"[SHARDLENS] Port 9090 is in use, so analytics are kept but the owner console cannot read them until the next start. Set SHARDLENS_PORT to a free one.",
		]);
	});

	/** A collector that cannot start is a warning, never the connection string, and the bot carries on without it. */
	it("answers null and says what to change when the collector cannot start", async () => {
		mockStart = () => Promise.reject(Object.assign(new Error("not authorized on testify"), { code: 13 }));
		const { client, warned } = clientWith({});

		expect(await startInBotCollector(client)).toBeNull();
		expect(warned[0]?.[1]).toBe(
			"[SHARDLENS] The collector inside the bot could not start, so analytics are off until the next start. The database user in MONGODB_URI may not create collections: give it readWrite on the bot's database.",
		);
		expect(JSON.stringify(warned)).not.toContain("hunter2");
	});
});

describe("the collector's settings", () => {
	it("reads a port, an audit key and the failures with a fix", () => {
		const wrong = [
			[collectorPort(undefined), COLLECTOR_PORT],
			[collectorPort("9090"), 9090],
			[collectorPort("0"), null],
			[collectorPort("65536"), null],
			[collectorPort("80 80"), null],
			[isAuditKey(AUDIT_KEY), true],
			[isAuditKey(Buffer.alloc(31).toString("base64")), false],
			[startAdvice(Object.assign(new Error(), { code: 13 }))?.includes("readWrite"), true],
			[startAdvice(new Error("anything else")), null],
		].filter(([got, want]) => got !== want);

		expect(wrong).toEqual([]);
	});
});
