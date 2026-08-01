import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { commands as commandRoutes } from "@api/routes/commands";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { type CommandCatalogue } from "@testify/shared";

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

function aCommand(name: string, overrides: Partial<Command> = {}): Command {
	return { name, description: `The ${name} command.`, category: "info", ...overrides };
}

const REGISTRY = new Collection<string, Command>([
	["ping", aCommand("ping")],
	["ban", aCommand("ban", { category: "moderation" })],
	["eval", aCommand("eval", { category: "owner", ownerOnly: true })],
]);

function app(session: { userId: string } | null): Hono<ApiBindings> {
	const client = {
		commands: REGISTRY,
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn(), debug: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		if (session !== null) context.set("session", { _id: "s", ...session, username: "someone" } as never);
		await next();
	});
	instance.route("/commands", commandRoutes);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function catalogueFor(session: { userId: string } | null): Promise<CommandCatalogue> {
	return (await (await app(session).request("/commands")).json()) as CommandCatalogue;
}

describe("the command catalogue endpoint", () => {
	it("refuses a caller with no session", async () => {
		expect((await app(null).request("/commands")).status).toBe(401);
	});

	it("lists the commands the bot has loaded", async () => {
		const catalogue = await catalogueFor({ userId: MANAGER });

		expect(catalogue.commands.map((command) => command.name)).toEqual(["ban", "ping"]);
		expect(catalogue.prefix).toBe("t?");
	});

	/** The point of filtering rather than disabling: a manager should not learn what the owner commands are. */
	it("hides owner commands from a server manager", async () => {
		const catalogue = await catalogueFor({ userId: MANAGER });

		expect(catalogue.commands.some((command) => command.name === "eval")).toBe(false);
		expect(JSON.stringify(catalogue)).not.toContain("eval");
	});

	it("shows them to the bot owner", async () => {
		const catalogue = await catalogueFor({ userId: OWNER });

		expect(catalogue.commands.some((command) => command.name === "eval")).toBe(true);
	});

	/** The registry holds `run` functions; serialising one would be meaningless and could leak internals. */
	it("sends metadata only, never the handlers", async () => {
		const catalogue = await catalogueFor({ userId: MANAGER });

		expect(Object.keys(catalogue.commands[0]!).sort()).toEqual([
			"aliases",
			"botPermissions",
			"category",
			"cooldownMs",
			"description",
			"guildOnly",
			"name",
			"nsfw",
			"options",
			"ownerOnly",
			"permissions",
			"subcommands",
		]);
	});
});
