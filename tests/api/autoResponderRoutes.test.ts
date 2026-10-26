import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { autoResponders } from "@api/routes/autoResponders";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { AUTO_RESPONDER_LIMITS, type AutoResponder, type AutoResponderList, triggerKey } from "@testify/shared";

/** A stand-in for the collection, with its unique index, so the route runs through the real actions. */
const stored = new Map<string, AutoResponder[]>();
let nextId = 0;
const rows = (guildId: string): AutoResponder[] => stored.get(guildId) ?? [];

jest.mock("@database/repositories/autoResponderRepository", () => ({
	listAutoResponders: jest.fn((guildId: string) => Promise.resolve([...rows(guildId)])),
	findAutoResponder: jest.fn((guildId: string, id: string) =>
		Promise.resolve(rows(guildId).find((row) => row.id === id) ?? null),
	),
	createAutoResponder: jest.fn((guildId: string, input: Omit<AutoResponder, "id">) => {
		if (rows(guildId).some((row) => triggerKey(row.trigger) === triggerKey(input.trigger)))
			return Promise.resolve(null);
		nextId += 1;
		const row = { id: nextId.toString(16).padStart(24, "0"), ...input };
		stored.set(guildId, [...rows(guildId), row]);
		return Promise.resolve(row);
	}),
	updateAutoResponder: jest.fn((guildId: string, id: string, input: Omit<AutoResponder, "id">) => {
		const row = { id, ...input };
		stored.set(
			guildId,
			rows(guildId).map((existing) => (existing.id === id ? row : existing)),
		);
		return Promise.resolve(row);
	}),
	deleteAutoResponder: jest.fn((guildId: string, id: string) => {
		stored.set(
			guildId,
			rows(guildId).filter((row) => row.id !== id),
		);
		return Promise.resolve(true);
	}),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const MISSING = "f".repeat(24);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", memberCount: 3 };
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/auto-responders", autoResponders);
	instance.onError((error) => {
		// The same mapping the real app's boundary makes in `server.ts`.
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return instance;
}

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/auto-responders${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const rules = { trigger: "rules", match: "word", reply: "Read #rules." };

beforeEach(() => {
	stored.clear();
	jest.clearAllMocks();
});

describe("the auto-responder routes", () => {
	it("starts a server off with none, and says how many it may keep", async () => {
		const list = (await (await send("GET")).json()) as AutoResponderList;

		expect(list).toEqual({ responders: [], limit: AUTO_RESPONDER_LIMITS.maxPerGuild });
	});

	it("adds one, answers with the whole list, and writes it down", async () => {
		const response = await send("POST", "", rules);

		expect(response.status).toBe(201);
		expect(((await response.json()) as AutoResponderList).responders).toEqual([expect.objectContaining(rules)]);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "autoResponder.create" }));
	});

	it("refuses a repeat and a full server in words, with nothing written", async () => {
		await send("POST", "", rules);

		const repeat = await send("POST", "", { ...rules, trigger: "RULES" });
		expect(repeat.status).toBe(400);
		expect(JSON.stringify(await repeat.json())).toContain("already an auto-responder");

		stored.set(
			GUILD,
			Array.from(
				{ length: AUTO_RESPONDER_LIMITS.maxPerGuild },
				(_, index) => ({ ...rules, id: String(index), trigger: `t${String(index)}` }) as AutoResponder,
			),
		);
		const full = await send("POST", "", { ...rules, trigger: "one more" });
		expect(full.status).toBe(400);
		expect(recordAudit).toHaveBeenCalledTimes(1);
	});

	/** Validated by the shared schema before the actions are reached, so the form and the API agree. */
	it("refuses a body the schema does not accept", async () => {
		expect((await send("POST", "", { ...rules, match: "anywhere" })).status).toBe(400);
		expect((await send("POST", "", { ...rules, reply: "x".repeat(AUTO_RESPONDER_LIMITS.maxReply + 1) })).status).toBe(
			400,
		);
	});

	it("edits one and deletes it", async () => {
		const id = ((await (await send("POST", "", rules)).json()) as AutoResponderList).responders[0]!.id;

		const edited = (await (await send("PUT", `/${id}`, { ...rules, match: "exact" })).json()) as AutoResponderList;
		expect(edited.responders[0]?.match).toBe("exact");

		const removed = (await (await send("DELETE", `/${id}`)).json()) as AutoResponderList;
		expect(removed.responders).toEqual([]);
	});

	it("answers 404 for one that is not there, and 400 for an id that is not one", async () => {
		expect((await send("PUT", `/${MISSING}`, rules)).status).toBe(404);
		expect((await send("DELETE", `/${MISSING}`)).status).toBe(404);
		expect((await send("DELETE", "/not-an-id")).status).toBe(400);
	});
});
