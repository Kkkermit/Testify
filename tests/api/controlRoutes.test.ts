import { Collection } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { control } from "@api/routes/control";
import { type Env } from "@config/env";
import { settingsTarget, type TestifyClient } from "@core/client";
import { logRing } from "@core/logRing";
import { shutdown } from "@core/shutdown";
import { getAuditLogConfig } from "@database/repositories/auditLogRepository";
import { getBotSettings, saveBotSettings } from "@database/repositories/botSettingsRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { clearLogLines, deleteLogRun } from "@database/repositories/logRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { AnalyticsUnavailable } from "@lib/bot/shardlensReader.util";
import { oneGuildActivity } from "@lib/bot/usageReport.util";
import { type OwnerGuildDetail } from "@testify/shared";

jest.mock("@core/shutdown", () => ({ shutdown: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/botSettingsRepository", () => ({
	getBotSettings: jest.fn(() => Promise.resolve(null)),
	saveBotSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/countingRepository", () => ({
	getCounting: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@lib/bot/usageReport.util", () => ({
	...jest.requireActual<object>("@lib/bot/usageReport.util"),
	oneGuildActivity: jest.fn(),
}));
jest.mock("@database/repositories/logRepository", () => ({
	clearLogLines: jest.fn(() => Promise.resolve()),
	deleteLogRun: jest.fn(() => Promise.resolve(false)),
}));
jest.mock("@lib/bot/botIdentity.util", () => ({
	botIdentity: jest.fn(() => Promise.resolve({ id: "1", username: "Renamed", avatarUrl: null, bannerUrl: null })),
	forgetBotIdentity: jest.fn(),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const GUILD = "900000000000000001";

function clientFor(overrides: Partial<TestifyClient> = {}): TestifyClient {
	const guild = {
		id: GUILD,
		name: "Test Server",
		memberCount: 1_234,
		ownerId: "700000000000000001",
		iconURL: () => null,
		joinedAt: new Date("2026-01-01T00:00:00.000Z"),
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		channels: { cache: new Collection() },
		roles: { cache: new Collection() },
		members: {
			me: { nickname: "Testy", permissions: { has: () => true }, roles: { highest: { name: "Bots" } } },
		},
	};

	return {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
		isReady: () => true,
		ws: { ping: 42 },
		user: { setUsername: jest.fn(() => Promise.resolve({})), setAvatar: jest.fn(() => Promise.resolve({})) },
		paused: false,
		pausedAt: null,
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		lensTarget: settingsTarget((overrides.env ?? {}) as Env),
		...overrides,
	} as unknown as TestifyClient;
}

function app(client: TestifyClient, userId = OWNER): Hono<ApiBindings> {
	const instance = new Hono<ApiBindings>();
	withSession(instance, client, { userId, username: "someone" });
	instance.route("/control", control);
	answerLikeTheApp(instance);

	return instance;
}

async function send(
	path: string,
	{ method = "GET", body, userId = OWNER, client = clientFor() }: Record<string, unknown> = {},
): Promise<Response> {
	return app(client as TestifyClient, userId as string).request(`/control${path}`, {
		method: method as string,
		headers: { "content-type": "application/json" },
		// A GET may not carry a body, and the shared refusal cases pass one for the POSTs beside them.
		...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getLevelSettings).mockResolvedValue(null);
	jest.mocked(getAuditLogConfig).mockResolvedValue(null);
	jest.mocked(getCounting).mockResolvedValue(null);
	jest.mocked(getWelcome).mockResolvedValue(null);
	jest.mocked(oneGuildActivity).mockResolvedValue({ commands: 12, dashboard: 3 });
	jest.mocked(getBotSettings).mockResolvedValue(null);
});

describe("who can control the bot", () => {
	/** Pausing, renaming and shutting down the bot are the most dangerous things this API can do. */
	it.each([
		["GET", ""],
		["POST", "/gateway"],
		["POST", "/shutdown"],
		["PATCH", "/identity"],
		["GET", `/guilds/${GUILD}`],
		["GET", "/music"],
		["PUT", "/music"],
		["DELETE", `/logs/${logRing.run.id}`],
		["GET", "/shardlens"],
		["POST", "/shardlens/send"],
	])("hides %s %s from a manager", async (method, path) => {
		const response = await send(path, { method, userId: MANAGER, body: {} });

		expect(response.status).toBe(404);
	});
});

describe("deleting logs", () => {
	const PAST = "00000000-0000-4000-8000-000000000001";

	/** The run going now keeps its place and carries on logging; only what it held so far goes. */
	it("empties the run going now, in memory and in the database", async () => {
		logRing.push({ at: Date.now(), level: "info", message: "before", context: {} });

		const response = await send(`/logs/${logRing.run.id}`, { method: "DELETE" });

		expect(response.status).toBe(204);
		expect(logRing.size).toBe(0);
		expect(clearLogLines).toHaveBeenCalledWith(logRing.run.id);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "logs.delete" }));
	});

	it("deletes a past run, and answers 404 for one it does not hold", async () => {
		jest.mocked(deleteLogRun).mockResolvedValueOnce(true);

		expect((await send(`/logs/${PAST}`, { method: "DELETE" })).status).toBe(204);
		expect((await send(`/logs/${PAST}`, { method: "DELETE" })).status).toBe(404);
		expect((await send("/logs/not-a-run", { method: "DELETE" })).status).toBe(400);
	});
});

describe("pausing and resuming", () => {
	it("resumes", async () => {
		const client = clientFor({ paused: true, pausedAt: Date.now() });
		await send("/gateway", { method: "POST", body: { action: "resume" }, client });

		expect(client.paused).toBe(false);
		expect(client.pausedAt).toBeNull();
	});

	it("refuses an action it does not have", async () => {
		expect((await send("/gateway", { method: "POST", body: { action: "restart" } })).status).toBe(400);
	});

	it("records both in the audit log", async () => {
		await send("/gateway", { method: "POST", body: { action: "pause" } });

		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "bot.pause" }));
	});
});

describe("shutting down", () => {
	it("refuses without the typed confirmation", async () => {
		expect((await send("/shutdown", { method: "POST", body: {} })).status).toBe(400);
		expect((await send("/shutdown", { method: "POST", body: { confirm: "yes" } })).status).toBe(400);
		expect(shutdown).not.toHaveBeenCalled();
	});

	/** Answered first, so the browser is told rather than left holding a dropped connection. */
	it("answers before it stops", async () => {
		jest.useFakeTimers();

		try {
			const response = await send("/shutdown", { method: "POST", body: { confirm: "shut down" } });

			expect(response.status).toBe(200);
			expect(shutdown).not.toHaveBeenCalled();

			jest.runAllTimers();
			expect(shutdown).toHaveBeenCalled();
		} finally {
			jest.useRealTimers();
		}
	});
});

describe("the bot's own profile", () => {
	it("refuses a name Discord would not take", async () => {
		expect((await send("/identity", { method: "PATCH", body: { username: "x" } })).status).toBe(400);
		expect((await send("/identity", { method: "PATCH", body: { username: "x".repeat(40) } })).status).toBe(400);
	});

	/** An avatar arrives as a data URI, and anything else is a URL the bot would go and fetch. */
	it("refuses an avatar that is not an inline image", async () => {
		for (const avatar of ["https://example.com/a.png", "data:text/html;base64,PHNjcmlwdD4=", "not-a-uri"]) {
			expect((await send("/identity", { method: "PATCH", body: { avatar } })).status).toBe(400);
		}
	});

	it("accepts an inline PNG", async () => {
		const client = clientFor();
		const avatar = "data:image/png;base64,iVBORw0KGgo=";
		await send("/identity", { method: "PATCH", body: { avatar }, client });

		expect(client.user?.setAvatar).toHaveBeenCalledWith(avatar);
	});

	it("passes a refusal from Discord back rather than swallowing it", async () => {
		const client = clientFor();
		(client.user as unknown as { setUsername: jest.Mock }).setUsername = jest.fn(() =>
			Promise.reject(new Error("You are changing your username too fast.")),
		);

		const response = await send("/identity", { method: "PATCH", body: { username: "Nope" }, client });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("too fast");
	});
});

describe("a server's detail", () => {
	/** "audit logging" here beside "audit-logging" in the server list made one server read as two. */
	it("reports what that server has configured, by the same keys the server list uses", async () => {
		jest.mocked(getWelcome).mockResolvedValue({ guildId: GUILD, channelId: "1" } as never);
		jest.mocked(getAuditLogConfig).mockResolvedValue({ channelId: "1", enabledLogs: ["all"] } as never);

		const { configured } = (await (await send(`/guilds/${GUILD}`)).json()) as OwnerGuildDetail;

		expect(configured).toEqual(["audit-logging", "welcome"]);
	});

	/** An id straight out of a URL reaches a Mongo filter if nothing checks its shape first. */
	it("rejects an id that is not a snowflake", async () => {
		expect((await send("/guilds/nonsense")).status).toBe(400);
	});

	it("counts that server's use from Shardlens, and only that server's", async () => {
		const detail = (await (await send(`/guilds/${GUILD}`)).json()) as OwnerGuildDetail;

		expect(jest.mocked(oneGuildActivity).mock.calls[0]?.[1]).toBe(GUILD);
		expect(detail).toMatchObject({ usage: 12, dashboardViews: 3, analytics: null });
	});

	/** The page is how the owner leaves or inspects a server, so a missing collector costs only the two counts. */
	it("still answers while Shardlens cannot be read, saying why", async () => {
		jest.mocked(oneGuildActivity).mockRejectedValueOnce(new AnalyticsUnavailable("refused"));

		const response = await send(`/guilds/${GUILD}`);

		expect(response.status).toBe(200);
		expect((await response.json()) as OwnerGuildDetail).toMatchObject({
			usage: null,
			dashboardViews: null,
			analytics: "refused",
		});
	});
});

describe("leaving a server", () => {
	function clientThatCanLeave(leave = jest.fn(() => Promise.resolve({}))): {
		client: TestifyClient;
		leave: jest.Mock;
	} {
		const client = clientFor();
		const guild = client.guilds.cache.get(GUILD) as unknown as { leave: jest.Mock };
		guild.leave = leave;

		return { client, leave };
	}

	/** The server compares the name itself; a hand-written request cannot remove the bot. */
	it("refuses a name that does not match, and does not leave", async () => {
		const { client, leave } = clientThatCanLeave();

		const response = await send(`/guilds/${GUILD}/leave`, { method: "POST", body: { confirm: "test server" }, client });

		expect(response.status).toBe(400);
		expect(leave).not.toHaveBeenCalled();
	});

	it("refuses a request with no confirmation at all", async () => {
		const { client, leave } = clientThatCanLeave();

		expect((await send(`/guilds/${GUILD}/leave`, { method: "POST", body: {}, client })).status).toBe(400);
		expect(leave).not.toHaveBeenCalled();
	});

	/** The name is unreadable once the guild is gone, so the record has to be written while it still is. */
	it("writes the audit record before it leaves", async () => {
		const order: string[] = [];
		jest.mocked(recordAudit).mockImplementation(() => {
			order.push("audit");
			return Promise.resolve();
		});
		const { client } = clientThatCanLeave(
			jest.fn(() => {
				order.push("leave");
				return Promise.resolve({});
			}),
		);

		await send(`/guilds/${GUILD}/leave`, { method: "POST", body: { confirm: "Test Server" }, client });

		expect(order).toEqual(["audit", "leave"]);
	});

	it("explains itself when Discord refuses", async () => {
		const { client } = clientThatCanLeave(jest.fn(() => Promise.reject(new Error("500 internal"))));

		const response = await send(`/guilds/${GUILD}/leave`, { method: "POST", body: { confirm: "Test Server" }, client });

		expect(response.status).toBe(400);
		expect(client.logger.error).toHaveBeenCalled();
	});
});

describe("music sources", () => {
	it("stores the owner's choice and records who made it, with what it was before", async () => {
		const response = await send("/music", { method: "PUT", body: { sources: "soundcloud" } });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ sources: "soundcloud", configured: true });
		expect(saveBotSettings).toHaveBeenCalledWith({ musicSources: "soundcloud" }, OWNER);
		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "bot.musicSources",
				before: { sources: "both" },
				after: { sources: "soundcloud" },
			}),
		);
	});

	it.each([{}, { sources: "spotify" }, { sources: null }])("refuses %p", async (body) => {
		const response = await send("/music", { method: "PUT", body });

		expect(response.status).toBe(400);
		expect(saveBotSettings).not.toHaveBeenCalled();
	});

	/** A manager must not be able to switch a service off for every server the bot is in. */
	it("changes nothing when a manager tries", async () => {
		await send("/music", { method: "PUT", userId: MANAGER, body: { sources: "youtube" } });

		expect(saveBotSettings).not.toHaveBeenCalled();
	});
});

describe("Shardlens", () => {
	const KEY = "slk_ingest_abcdefghijklmnopqrstuvwxyz0123456789";

	function withLens(): { client: TestifyClient; flush: jest.Mock } {
		let queued = 3;
		const flush = jest.fn(() => {
			queued = 0;
			return Promise.resolve();
		});
		const lens = {
			flush,
			client: { idle: () => Promise.resolve() },
			stats: () => ({
				ready: true,
				mode: "privacy",
				queueDepth: queued,
				pendingSalt: 0,
				pendingInteractions: 0,
				dropped: {},
				failedFlushes: 0,
			}),
		};
		const env = { SHARDLENS_URL: "https://stats.example.com/v1", SHARDLENS_INGEST_KEY: KEY };
		return { client: clientFor({ shardlens: lens, env } as never), flush };
	}

	it("says it is off, and refuses to send to nothing", async () => {
		const client = clientFor({ shardlens: null, env: {} } as never);

		const status = await send("/shardlens", { client });
		expect(await status.json()).toMatchObject({ state: "off", collector: null });

		const sent = await send("/shardlens/send", { method: "POST", client });
		expect(sent.status).toBe(404);
		expect(recordAudit).not.toHaveBeenCalled();
	});

	/** The owner's browser is shown where analytics go and never the key that lets anybody send there. */
	it("reports the collector by its origin and never the key", async () => {
		const { client } = withLens();

		const response = await send("/shardlens", { client });
		const text = await response.text();

		expect(JSON.parse(text)).toMatchObject({ state: "sending", collector: "https://stats.example.com", queued: 3 });
		expect(text).not.toContain("slk_");
	});

	it("sends what is waiting and records that it did", async () => {
		const { client, flush } = withLens();

		const response = await send("/shardlens/send", { method: "POST", client });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ sent: 3, problem: null, status: { queued: 0 } });
		expect(flush).toHaveBeenCalledTimes(1);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "bot.shardlensSend" }));
	});
});
