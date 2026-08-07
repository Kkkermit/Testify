import { AutoModerationActionType, AutoModerationRuleTriggerType, Collection, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { automod } from "@api/routes/automod";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type AutomodRules } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const BOT = "200000000000000002";
const RULE = "500000000000000001";

const audited = jest.mocked(recordAudit);

const created = jest.fn();
const fetched = jest.fn();
const setEnabled = jest.fn();
const removed = jest.fn();

function ruleDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: RULE,
		name: "Block spam",
		enabled: true,
		triggerType: AutoModerationRuleTriggerType.Spam,
		creatorId: BOT,
		actions: [{ type: AutoModerationActionType.BlockMessage }],
		setEnabled,
		delete: removed,
		...overrides,
	};
}

/** `canManage` is the whole page's switch, so every test says outright which side of it it is on. */
function app(canManage = true): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { me: { permissions: { has: (flag: bigint) => canManage && flag === PermissionFlagsBits.ManageGuild } } },
		autoModerationRules: { create: created, fetch: fetched },
	};
	const client = {
		user: { id: BOT },
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
	instance.route("/guilds/:guildId/automod", automod);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path = "", body?: unknown, canManage = true): Promise<Response> {
	return app(canManage).request(`/guilds/${GUILD}/automod${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

/** discord.js answers `fetch()` with the whole collection and `fetch(id)` with one rule, and both are used here. */
function holding(doc = ruleDoc()): void {
	fetched.mockImplementation((id?: string) => Promise.resolve(id === undefined ? new Collection([[RULE, doc]]) : doc));
}

beforeEach(() => {
	jest.clearAllMocks();
	holding();
	created.mockResolvedValue({ name: "Block spam" });
});

describe("GET /automod", () => {
	it("lists what Discord holds", async () => {
		const body = (await (await send("GET")).json()) as AutomodRules;

		expect(body.canManage).toBe(true);
		expect(body.rules).toHaveLength(1);
		expect(body.rules[0]).toMatchObject({ id: RULE, name: "Block spam", preset: "spam", fromTestify: true });
	});

	/**
	 * Without Manage Server the fetch throws, and a 500 would read as a broken dashboard rather than a
	 * permission the admin can grant.
	 */
	it("says so rather than throwing when the bot cannot read them", async () => {
		const response = await send("GET", "", undefined, false);
		const body = (await response.json()) as AutomodRules;

		expect(response.status).toBe(200);
		expect(body).toEqual({ rules: [], canManage: false });
		expect(fetched).not.toHaveBeenCalled();
	});

	/** A rule Discord created is not one Testify is answerable for, and the badge must not claim otherwise. */
	it("does not claim a rule somebody else created", async () => {
		holding(ruleDoc({ creatorId: "300000000000000003" }));

		const body = (await (await send("GET")).json()) as AutomodRules;

		expect(body.rules[0]?.fromTestify).toBe(false);
	});
});

describe("POST /automod", () => {
	it("creates the preset it was given and answers with the new list", async () => {
		const response = await send("POST", "", { preset: "spam" });

		expect(response.status).toBe(200);
		expect(created).toHaveBeenCalledWith(expect.objectContaining({ triggerType: AutoModerationRuleTriggerType.Spam }));
		expect((await response.json()) as AutomodRules).toMatchObject({ canManage: true });
	});

	it("refuses a preset that is not one of the four", async () => {
		const response = await send("POST", "", { preset: "whatever" });

		expect(response.status).toBe(400);
		expect(created).not.toHaveBeenCalled();
	});

	/** The word reaches Discord's filter, so the same markup refusal as every other free-text field applies. */
	it("refuses HTML in the keyword", async () => {
		const response = await send("POST", "", { preset: "keyword", word: "<script>x</script>" });

		expect(response.status).toBe(400);
		expect(created).not.toHaveBeenCalled();
	});

	it("refuses a mention limit outside what Discord accepts", async () => {
		expect((await send("POST", "", { preset: "mention-spam", limit: 0 })).status).toBe(400);
		expect((await send("POST", "", { preset: "mention-spam", limit: 999 })).status).toBe(400);
		expect((await send("POST", "", { preset: "mention-spam", limit: 7 })).status).toBe(200);
	});

	it("refuses to add a rule without Manage Server", async () => {
		const response = await send("POST", "", { preset: "spam" }, false);

		expect(response.status).toBe(400);
		expect(created).not.toHaveBeenCalled();
	});

	it("writes an audit record naming the rule", async () => {
		await send("POST", "", { preset: "spam" });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "automod.create", summary: expect.stringContaining("Block spam") }),
		);
	});
});

describe("PATCH /automod/:ruleId", () => {
	it("turns a rule off", async () => {
		const response = await send("PATCH", `/${RULE}`, { enabled: false });

		expect(response.status).toBe(200);
		expect(setEnabled).toHaveBeenCalledWith(false, expect.any(String));
	});

	/** An id that is not a snowflake must be refused before it is handed to Discord as arbitrary text. */
	it("refuses a rule id that is not a snowflake", async () => {
		const response = await send("PATCH", "/not-an-id", { enabled: false });

		expect(response.status).toBe(400);
		expect(fetched).not.toHaveBeenCalled();
	});

	it("refuses a body that does not say what to set", async () => {
		expect((await send("PATCH", `/${RULE}`, {})).status).toBe(400);
		expect(setEnabled).not.toHaveBeenCalled();
	});

	/** A rule deleted in Discord since the page loaded is a 404, not a 500. */
	it("answers 404 for a rule that is no longer there", async () => {
		fetched.mockRejectedValue(new Error("unknown rule"));

		const response = await send("PATCH", `/${RULE}`, { enabled: false });

		expect(response.status).toBe(404);
	});

	it("refuses without Manage Server", async () => {
		const response = await send("PATCH", `/${RULE}`, { enabled: false }, false);

		expect(response.status).toBe(400);
		expect(setEnabled).not.toHaveBeenCalled();
	});

	it("records which way it was switched", async () => {
		await send("PATCH", `/${RULE}`, { enabled: true });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "automod.update", summary: expect.stringContaining("Enabled") }),
		);
	});
});

describe("DELETE /automod/:ruleId", () => {
	it("removes the rule and answers with the list", async () => {
		const response = await send("DELETE", `/${RULE}`);

		expect(response.status).toBe(200);
		expect(removed).toHaveBeenCalled();
	});

	/** The name is read before the delete, because afterwards there is nothing left to read it from. */
	it("names the removed rule in the audit record", async () => {
		await send("DELETE", `/${RULE}`);

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "automod.delete", summary: expect.stringContaining("Block spam") }),
		);
	});

	it("answers 404 for a rule that is no longer there", async () => {
		fetched.mockRejectedValue(new Error("unknown rule"));

		expect((await send("DELETE", `/${RULE}`)).status).toBe(404);
	});

	it("refuses without Manage Server", async () => {
		expect((await send("DELETE", `/${RULE}`, undefined, false)).status).toBe(400);
		expect(removed).not.toHaveBeenCalled();
	});
});
