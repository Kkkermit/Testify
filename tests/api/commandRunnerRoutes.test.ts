import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { commandRunner } from "@api/routes/commandRunner";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { UserFacingError } from "@core/errors";
import { disabledGlobally, disabledInGuild } from "@database/repositories/commandToggleRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type CommandCatalogue, type CommandRunResult } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/commandToggleRepository", () => ({
	disabledGlobally: jest.fn(() => Promise.resolve([])),
	disabledInGuild: jest.fn(() => Promise.resolve([])),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const GUILD = "900000000000000001";

/** `ping` is on the allowlist, so it stands in for a real runnable command. */
function pingCommand(overrides: Partial<Command> = {}): Command {
	return {
		name: "ping",
		description: "Checks the bot is awake.",
		category: "info",
		run: jest.fn(async (interaction) => {
			await interaction.reply({ content: "Pong" });
		}),
		...overrides,
	};
}

function clientFor(commands: Command[] = [pingCommand()]): TestifyClient {
	const registry = new Collection<string, Command>();
	for (const command of commands) registry.set(command.name, command);

	return {
		commands: registry,
		// A real Guild always carries these managers, and the adapter reads them to resolve options.
		guilds: {
			cache: new Collection<string, unknown>([
				[
					GUILD,
					{
						id: GUILD,
						name: "Test Server",
						members: { cache: new Collection() },
						roles: { cache: new Collection() },
						channels: { cache: new Collection() },
					},
				],
			]),
		},
		users: { fetch: jest.fn(() => Promise.resolve({ id: OWNER, username: "owner" })), cache: new Collection() },
		isOwner: (id: string) => id === OWNER,
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
	instance.route("/runner", commandRunner);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? new ApiProblem(400, "bad_request", error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(
	path = "",
	{ method = "GET", body, userId = OWNER, client = clientFor() }: Record<string, unknown> = {},
): Promise<Response> {
	return app(client as TestifyClient, userId as string).request(`/runner${path}`, {
		method: method as string,
		headers: { "content-type": "application/json" },
		...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(disabledGlobally).mockResolvedValue([]);
	jest.mocked(disabledInGuild).mockResolvedValue([]);
});

describe("who can run a command", () => {
	it.each([
		["GET", ""],
		["POST", "/ping"],
	])("hides %s from a manager", async (method, path) => {
		expect((await send(path, { method, userId: MANAGER, body: { args: {} } })).status).toBe(404);
	});
});

describe("what can be run", () => {
	it("lists only the allowlisted commands", async () => {
		const client = clientFor([pingCommand(), { ...pingCommand(), name: "ban" }]);

		const body = (await (await send("", { client })).json()) as CommandCatalogue;

		expect(body.commands.map((command) => command.name)).toEqual(["ping"]);
	});

	/**
	 * The list and the gate read the same predicate, so a command missing from the list cannot be run by
	 * guessing its URL — and the refusal says nothing about whether it exists.
	 */
	it("refuses to run a command that is not on the list", async () => {
		const client = clientFor([pingCommand(), { ...pingCommand(), name: "ban" }]);

		expect((await send("/ban", { method: "POST", body: { args: {} }, client })).status).toBe(404);
	});

	it("answers the same way for a command that does not exist at all", async () => {
		expect((await send("/nonsense", { method: "POST", body: { args: {} } })).status).toBe(404);
	});

	/** `/eval` over HTTP is a shell. It is refused even if it somehow reached the allowlist. */
	it("refuses eval", async () => {
		const client = clientFor([{ ...pingCommand(), name: "eval" }]);

		expect((await send("/eval", { method: "POST", body: { args: {} }, client })).status).toBe(404);
	});
});

describe("running one", () => {
	it("runs it and returns what it replied with", async () => {
		const response = await send("/ping", { method: "POST", body: { args: {} } });
		const body = (await response.json()) as CommandRunResult;

		expect(response.status).toBe(200);
		expect(body.outputs).toEqual([{ kind: "text", content: "Pong" }]);
		expect(body.degraded).toBe(false);
	});

	it("records every run, with the arguments it was given", async () => {
		await send("/ping", { method: "POST", body: { args: { text: "hello" } } });

		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "command.run",
				after: expect.objectContaining({ command: "ping", args: { text: "hello" } }),
			}),
		);
	});

	it("says when part of the answer only works in Discord", async () => {
		const client = clientFor([
			pingCommand({
				run: async (interaction) => {
					await interaction.reply({ content: "pick one", components: [{ type: 1 }] });
				},
			}),
		]);

		const body = (await (
			await send("/ping", { method: "POST", body: { args: {} }, client })
		).json()) as CommandRunResult;

		expect(body.degraded).toBe(true);
		expect(body.outputs).toContainEqual({ kind: "dropped", what: "buttons" });
	});

	it("turns the command's own refusal into a 400 the browser can read", async () => {
		const client = clientFor([
			pingCommand({
				run: () => {
					throw new UserFacingError("You need to give me `text`.");
				},
			}),
		]);

		const response = await send("/ping", { method: "POST", body: { args: {} }, client });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("You need to give me");
	});

	it("rejects a name that is not a command name", async () => {
		expect((await send("/../../etc", { method: "POST", body: { args: {} } })).status).toBe(404);
	});
});

describe("a command that needs a server", () => {
	const guildOnly = pingCommand({ guildOnly: true });

	it("refuses to run without one", async () => {
		const response = await send("/ping", { method: "POST", body: { args: {} }, client: clientFor([guildOnly]) });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("needs a server");
	});

	it("runs when one is given", async () => {
		const response = await send("/ping", {
			method: "POST",
			body: { args: {}, guildId: GUILD },
			client: clientFor([guildOnly]),
		});

		expect(response.status).toBe(200);
	});

	it("404s for a server the bot is not in", async () => {
		const response = await send("/ping", {
			method: "POST",
			body: { args: {}, guildId: "900000000000000009" },
			client: clientFor([guildOnly]),
		});

		expect(response.status).toBe(404);
	});
});

describe("subcommands", () => {
	const parent = pingCommand({
		run: undefined,
		subcommands: [
			{
				name: "info",
				description: "Info.",
				run: jest.fn(async (interaction) => {
					await interaction.reply({ content: "Some info" });
				}),
			},
		],
	} as never);

	it("runs the one that was named", async () => {
		const body = (await (
			await send("/ping", { method: "POST", body: { args: {}, subcommand: "info" }, client: clientFor([parent]) })
		).json()) as CommandRunResult;

		expect(body.outputs).toEqual([{ kind: "text", content: "Some info" }]);
		expect(body.subcommand).toBe("info");
	});

	/** A parent with no top-level `run` would otherwise crash inside the router rather than answer. */
	it("says which parts exist when none was named", async () => {
		const response = await send("/ping", { method: "POST", body: { args: {} }, client: clientFor([parent]) });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("info");
	});

	it("refuses a subcommand that does not exist", async () => {
		const response = await send("/ping", {
			method: "POST",
			body: { args: {}, subcommand: "nope" },
			client: clientFor([parent]),
		});

		expect(response.status).toBe(400);
	});
});

describe("switched-off commands", () => {
	/** "Off" that quietly still runs for one person is a much worse thing to debug than one that is simply off. */
	it("refuses one switched off bot-wide, owner included", async () => {
		jest.mocked(disabledGlobally).mockResolvedValue(["ping"]);

		const response = await send("/ping", { method: "POST", body: { args: {} } });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("switched off everywhere");
	});

	it("refuses one switched off in the server it was asked to run in", async () => {
		jest.mocked(disabledInGuild).mockResolvedValue(["ping"]);

		const response = await send("/ping", { method: "POST", body: { args: {}, guildId: GUILD } });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("switched off in that server");
	});
});
