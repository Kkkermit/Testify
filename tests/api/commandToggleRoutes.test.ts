import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { globalCommandToggles, guildCommandToggles } from "@api/routes/commandToggles";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import {
	disabledGlobally,
	disabledInGuild,
	GLOBAL_SCOPE,
	setDisabled,
} from "@database/repositories/commandToggleRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type CommandToggleState } from "@testify/shared";

jest.mock("@database/repositories/commandToggleRepository", () => ({
	GLOBAL_SCOPE: "GLOBAL",
	disabledGlobally: jest.fn(() => Promise.resolve([])),
	disabledInGuild: jest.fn(() => Promise.resolve([])),
	setDisabled: jest.fn((_scope: string, disabled: string[]) => Promise.resolve(disabled)),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

const globalList = jest.mocked(disabledGlobally);
const guildList = jest.mocked(disabledInGuild);
const saved = jest.mocked(setDisabled);

function app(userId = OWNER): Hono<ApiBindings> {
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, { id: GUILD, name: "Test Server" }]]) },
		commands: new Collection<string, unknown>([
			["ban", { name: "ban", ownerOnly: false }],
			["rank", { name: "rank", ownerOnly: false }],
			["eval", { name: "eval", ownerOnly: true }],
			["help", { name: "help", ownerOnly: false }],
		]),
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/commands", guildCommandToggles);
	instance.route("/owner/commands", globalCommandToggles);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(path: string, method = "GET", body?: unknown, userId = OWNER): Promise<Response> {
	return app(userId).request(path, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const GUILD_PATH = `/guilds/${GUILD}/commands`;

async function stateOf(response: Response): Promise<CommandToggleState> {
	return (await response.json()) as CommandToggleState;
}

beforeEach(() => {
	jest.clearAllMocks();
	globalList.mockResolvedValue([]);
	guildList.mockResolvedValue([]);
	saved.mockImplementation((_scope: string, disabled: string[]) => Promise.resolve(disabled));
});

describe("a server's own switches", () => {
	it("reports what is off here and what is off everywhere", async () => {
		guildList.mockResolvedValue(["ban"]);
		globalList.mockResolvedValue(["rank"]);

		const state = await stateOf(await send(GUILD_PATH));

		expect(state.disabled).toEqual(["ban"]);
		expect(state.disabledGlobally).toEqual(["rank"]);
		expect(state.locked).toContain("help");
	});

	/** The control is a set of switches whose value is the list, so one request replaces the whole thing. */
	it("replaces the whole list", async () => {
		await send(GUILD_PATH, "PUT", { disabled: ["ban", "rank"] });

		expect(saved).toHaveBeenCalledWith(GUILD, ["ban", "rank"], OWNER);
	});

	it("accepts an empty list, which is how everything is turned back on", async () => {
		await send(GUILD_PATH, "PUT", { disabled: [] });

		expect(saved).toHaveBeenCalledWith(GUILD, [], OWNER);
	});

	/**
	 * `/help` is how somebody finds out what is left. A server that switched it off would have no way back
	 * except this dashboard, so the API refuses rather than trusting the form to have greyed the switch out.
	 */
	it("refuses to switch off a command the bot needs", async () => {
		const response = await send(GUILD_PATH, "PUT", { disabled: ["help"] });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	/**
	 * A manager never sees owner commands in the catalogue, so one arriving in a body is a hand-written request.
	 * It is dropped rather than refused, because refusing would confirm the command exists.
	 */
	it("drops an owner-only command from a server's list rather than storing it", async () => {
		await send(GUILD_PATH, "PUT", { disabled: ["ban", "eval"] });

		expect(saved).toHaveBeenCalledWith(GUILD, ["ban"], OWNER);
	});

	it("does not report an owner-only command as switched off", async () => {
		guildList.mockResolvedValue(["eval"]);
		globalList.mockResolvedValue(["eval"]);

		const state = await stateOf(await send(GUILD_PATH));

		expect(state.disabled).toEqual([]);
		expect(state.disabledGlobally).toEqual([]);
	});

	it("rejects a name that is not a command name", async () => {
		for (const name of ["../../etc/passwd", "Ban", "a".repeat(40), ""]) {
			expect((await send(GUILD_PATH, "PUT", { disabled: [name] })).status).toBe(400);
		}
	});

	it("writes an audit record", async () => {
		await send(GUILD_PATH, "PUT", { disabled: ["ban"] });

		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "commands.toggle" }));
	});
});

describe("the bot-wide switches", () => {
	it("writes against the global scope", async () => {
		await send("/owner/commands", "PUT", { disabled: ["ban"] });

		expect(saved).toHaveBeenCalledWith(GLOBAL_SCOPE, ["ban"], OWNER);
	});

	/** The owner does see owner commands, so theirs is the one list that may contain one. */
	it("lets the owner switch off an owner-only command", async () => {
		await send("/owner/commands", "PUT", { disabled: ["eval"] });

		expect(saved).toHaveBeenCalledWith(GLOBAL_SCOPE, ["eval"], OWNER);
	});

	it("still refuses a command the bot needs", async () => {
		expect((await send("/owner/commands", "PUT", { disabled: ["help"] })).status).toBe(400);
	});

	it("writes its own audit action, so the two scopes are distinguishable", async () => {
		await send("/owner/commands", "PUT", { disabled: ["ban"] });

		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "commands.toggle-global" }));
	});
});
