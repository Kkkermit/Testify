import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { blacklist } from "@api/routes/blacklist";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import {
	addToBlacklist,
	findBlacklistEntry,
	listBlacklist,
	removeFromBlacklist,
} from "@database/repositories/blacklistRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type BlacklistRow } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/blacklistRepository", () => ({
	addToBlacklist: jest.fn(),
	findBlacklistEntry: jest.fn(),
	listBlacklist: jest.fn(),
	removeFromBlacklist: jest.fn(),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const TARGET = "100000000000000003";
const BOT = "100000000000000009";

function entryFor(userId = TARGET, reason = "Spamming commands"): { userId: string; reason: string; createdAt: Date } {
	return { userId, reason, createdAt: new Date("2026-01-01T00:00:00.000Z") };
}

function clientFor(cachedUser: unknown = null, fetch = jest.fn(() => Promise.reject(new Error("unknown user")))) {
	const cache = new Collection<string, unknown>();
	if (cachedUser !== null) cache.set(TARGET, cachedUser);

	return {
		isOwner: (id: string) => id === OWNER,
		user: { id: BOT },
		users: { cache, fetch },
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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
	instance.route("/blacklist", blacklist);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(
	path = "",
	{ method = "GET", body, userId = OWNER, client = clientFor() }: Record<string, unknown> = {},
): Promise<Response> {
	return app(client as TestifyClient, userId as string).request(`/blacklist${path}`, {
		method: method as string,
		headers: { "content-type": "application/json" },
		...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(listBlacklist).mockResolvedValue([]);
	jest
		.mocked(addToBlacklist)
		.mockImplementation((userId, reason) => Promise.resolve(entryFor(userId, reason) as never));
	jest.mocked(findBlacklistEntry).mockResolvedValue(entryFor() as never);
	jest.mocked(removeFromBlacklist).mockResolvedValue(true);
});

describe("who can read the blacklist", () => {
	/** The list of who has been blocked from the bot is not something a server manager needs to see. */
	it.each([
		["GET", ""],
		["POST", ""],
		["DELETE", `/${TARGET}`],
	])("hides %s from a manager", async (method, path) => {
		const response = await send(path, { method, userId: MANAGER, body: { userId: TARGET, reason: "" } });

		expect(response.status).toBe(404);
	});
});

describe("reading the blacklist", () => {
	it("lists who is on it and why", async () => {
		jest.mocked(listBlacklist).mockResolvedValue([entryFor()] as never);

		const rows = (await (await send()).json()) as BlacklistRow[];

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ userId: TARGET, reason: "Spamming commands" });
	});

	it("puts a name beside the id when Discord knows the account", async () => {
		jest.mocked(listBlacklist).mockResolvedValue([entryFor()] as never);
		const client = clientFor({ tag: "spammer", displayAvatarURL: () => "https://cdn.example/avatar.png" });

		const rows = (await (await send("", { client })).json()) as BlacklistRow[];

		expect(rows[0]).toMatchObject({ tag: "spammer", avatarUrl: "https://cdn.example/avatar.png" });
	});

	/**
	 * A deleted account cannot be looked up, and an entry nobody can read is an entry nobody can lift — so the
	 * row still comes back, with the id and no name.
	 */
	it("still lists an account Discord no longer knows", async () => {
		jest.mocked(listBlacklist).mockResolvedValue([entryFor()] as never);

		const rows = (await (await send()).json()) as BlacklistRow[];

		expect(rows[0]).toMatchObject({ userId: TARGET, tag: null, avatarUrl: null });
	});
});

describe("adding to the blacklist", () => {
	it("blocks the user and says so", async () => {
		const response = await send("", { method: "POST", body: { userId: TARGET, reason: "Spamming commands" } });

		expect(response.status).toBe(200);
		expect(addToBlacklist).toHaveBeenCalledWith(TARGET, "Spamming commands");
	});

	/** The bot's own refusal reads better than an empty cell in the table. */
	it("stores a default reason when none is given", async () => {
		await send("", { method: "POST", body: { userId: TARGET, reason: "" } });

		expect(addToBlacklist).toHaveBeenCalledWith(TARGET, "No reason provided");
	});

	/**
	 * The gate lives in `blacklistActions.util.ts` so `/blacklist add` and this route cannot disagree — an owner
	 * who could block another owner could lock every one of them out of their own bot.
	 */
	it("refuses to blacklist a bot owner", async () => {
		const response = await send("", { method: "POST", body: { userId: OWNER, reason: "oops" } });

		expect(response.status).toBe(400);
		expect(addToBlacklist).not.toHaveBeenCalled();
	});

	it("refuses to blacklist the bot itself", async () => {
		const response = await send("", { method: "POST", body: { userId: BOT, reason: "oops" } });

		expect(response.status).toBe(400);
		expect(addToBlacklist).not.toHaveBeenCalled();
	});

	it("rejects an id that is not a snowflake", async () => {
		const response = await send("", { method: "POST", body: { userId: "nonsense", reason: "" } });

		expect(response.status).toBe(400);
		expect(addToBlacklist).not.toHaveBeenCalled();
	});

	it("records who was blocked", async () => {
		await send("", { method: "POST", body: { userId: TARGET, reason: "Spamming commands" } });

		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "blacklist.add" }));
	});
});

describe("lifting a blacklist", () => {
	it("removes the entry", async () => {
		const response = await send(`/${TARGET}`, { method: "DELETE" });

		expect(response.status).toBe(200);
		expect(removeFromBlacklist).toHaveBeenCalledWith(TARGET);
	});

	it("404s for somebody who was never on it", async () => {
		jest.mocked(removeFromBlacklist).mockResolvedValue(false);

		expect((await send(`/${TARGET}`, { method: "DELETE" })).status).toBe(404);
	});

	/** Removing before reading would leave the record saying only that somebody was lifted. */
	it("records the reason they had been blocked for", async () => {
		await send(`/${TARGET}`, { method: "DELETE" });

		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ before: expect.objectContaining({ reason: "Spamming commands" }) }),
		);
	});

	it("rejects an id that is not a snowflake", async () => {
		expect((await send("/nonsense", { method: "DELETE" })).status).toBe(400);
		expect(removeFromBlacklist).not.toHaveBeenCalled();
	});
});
