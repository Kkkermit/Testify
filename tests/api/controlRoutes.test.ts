import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { control } from "@api/routes/control";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { shutdown } from "@core/shutdown";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getAuditLogConfig, getCounting, getWelcome } from "@database/repositories/settingsRepository";
import { guildTallies } from "@database/repositories/usageRepository";
import { type BotControlState, type OwnerGuildDetail } from "@testify/shared";

jest.mock("@core/shutdown", () => ({ shutdown: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/settingsRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	getCounting: jest.fn(() => Promise.resolve(null)),
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/usageRepository", () => ({ guildTallies: jest.fn(() => Promise.resolve([])) }));
jest.mock("@lib/botIdentity.util", () => ({
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
		...overrides,
	} as unknown as TestifyClient;
}

function app(client: TestifyClient, userId = OWNER): Hono<ApiBindings> {
	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId, username: "someone" } as never);
		await next();
	});
	instance.route("/control", control);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

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
	jest.mocked(guildTallies).mockResolvedValue([]);
});

describe("who can control the bot", () => {
	/** Pausing, renaming and shutting down the bot are the most dangerous things this API can do. */
	it.each([
		["GET", ""],
		["POST", "/gateway"],
		["POST", "/shutdown"],
		["PATCH", "/identity"],
		["GET", `/guilds/${GUILD}`],
	])("hides %s %s from a manager", async (method, path) => {
		const response = await send(path, { method, userId: MANAGER, body: {} });

		expect(response.status).toBe(404);
	});

	it("does nothing when a manager tries to pause it", async () => {
		const client = clientFor();
		await send("/gateway", { method: "POST", userId: MANAGER, body: { action: "pause" }, client });

		expect(client.paused).toBe(false);
	});
});

describe("pausing and resuming", () => {
	it("reports the current state", async () => {
		const state = (await (await send("")).json()) as BotControlState;

		expect(state).toMatchObject({ gateway: "online", guilds: 1, pingMs: 42 });
	});

	it("pauses, and says so", async () => {
		const client = clientFor();
		const state = (await (
			await send("/gateway", { method: "POST", body: { action: "pause" }, client })
		).json()) as BotControlState;

		expect(client.paused).toBe(true);
		expect(state.gateway).toBe("paused");
		expect(state.since).not.toBeNull();
	});

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
	/**
	 * This ends the process the dashboard is served from, so it is typed rather than clicked — the same shape
	 * as every other confirmation that cannot be undone from the screen that started it.
	 */
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
	it("renames it", async () => {
		const client = clientFor();
		await send("/identity", { method: "PATCH", body: { username: "Testify Two" }, client });

		expect(client.user?.setUsername).toHaveBeenCalledWith("Testify Two");
	});

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
	it("describes the server and the bot's place in it", async () => {
		const detail = (await (await send(`/guilds/${GUILD}`)).json()) as OwnerGuildDetail;

		expect(detail).toMatchObject({
			id: GUILD,
			name: "Test Server",
			memberCount: 1_234,
			nickname: "Testy",
			highestRole: "Bots",
		});
	});

	it("reports what that server has configured", async () => {
		jest.mocked(getWelcome).mockResolvedValue({ guildId: GUILD, channelId: "1" } as never);

		expect(((await (await send(`/guilds/${GUILD}`)).json()) as OwnerGuildDetail).configured).toContain("welcome");
	});

	it("404s for a server the bot is not in", async () => {
		expect((await send("/guilds/900000000000000009")).status).toBe(404);
	});

	/** An id straight out of a URL reaches a Mongo filter if nothing checks its shape first. */
	it("rejects an id that is not a snowflake", async () => {
		expect((await send("/guilds/nonsense")).status).toBe(400);
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

	it("leaves when the name matches", async () => {
		const { client, leave } = clientThatCanLeave();

		const response = await send(`/guilds/${GUILD}/leave`, { method: "POST", body: { confirm: "Test Server" }, client });

		expect(response.status).toBe(200);
		expect(leave).toHaveBeenCalled();
	});

	/**
	 * The browser asking for the name is a courtesy; this check is the gate. A hand-written request with an
	 * empty body must not be able to remove the bot from a server.
	 */
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

	it("hides it from a manager", async () => {
		const { client, leave } = clientThatCanLeave();
		const response = await send(`/guilds/${GUILD}/leave`, {
			method: "POST",
			body: { confirm: "Test Server" },
			client,
			userId: MANAGER,
		});

		expect(response.status).toBe(404);
		expect(leave).not.toHaveBeenCalled();
	});

	it("404s for a server the bot is not in", async () => {
		const response = await send("/guilds/900000000000000009/leave", { method: "POST", body: { confirm: "x" } });

		expect(response.status).toBe(404);
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
