import { type Guild } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireOwner } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { DEFAULT_PREFIX } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { disabledGlobally, disabledInGuild } from "@database/repositories/commandToggleRepository";
import { buildCatalogue } from "@lib/commandCatalogue.util";
import { DashboardInteraction, runnableInDashboard, serialiseReply } from "@lib/commandRunner.util";
import {
	type CommandRunResult,
	commandNameParam,
	commandRunRequest,
	type RunOutput,
	type CommandCatalogue,
} from "@testify/shared";

/**
 * Running an owner command from the browser, over an allowlist.
 *
 * The list of what may be run lives in `commandRunner.util.ts` beside the adapter, so adding a name is one edit
 * and is visible in a diff. Everything here is behind `requireOwner`, which answers 404.
 */

export const commandRunner = new Hono<ApiBindings>();

commandRunner.use("*", requireOwner);

/** The same metadata `/help` and Discord are built from, filtered to what may be run. */
commandRunner.get("/", (context) => {
	const client = context.get("client");
	const runnable = [...client.commands.values()].filter((command) => runnableInDashboard(command.name));

	const body: CommandCatalogue = buildCatalogue(runnable, { prefix: DEFAULT_PREFIX, includeOwnerOnly: true });
	return context.json(body);
});

commandRunner.post("/:name", async (context) => {
	const client = context.get("client");
	const { name } = parseParams(context, commandNameParam);
	const request = await parseBody(context, commandRunRequest);

	const command = client.commands.get(name);
	// Not on the list and not a command at all answer the same way: neither is something to go looking for.
	if (command === undefined || !runnableInDashboard(name)) {
		throw notFound("command_not_runnable", "That command cannot be run from here.");
	}

	const guild = resolveGuild(client, command, request.guildId ?? null);
	await assertEnabled(name, guild?.id ?? null);

	// `requireOwner` has already refused an anonymous caller; this narrows the type rather than re-checking.
	const session = context.get("session");
	const user = session === undefined ? null : await client.users.fetch(session.userId).catch(() => null);
	if (user === null) throw badRequest("Discord does not know your account, so the command has nobody to run as.");

	const interaction = new DashboardInteraction(client, command, user, guild, request);
	const runner = pickRunner(command, request.subcommand ?? null);

	await runner(interaction, client);

	const outputs = interaction.captured.flatMap((reply) => serialiseReply(reply));

	await auditChange(context, {
		action: "command.run",
		summary: `Ran /${name}${request.subcommand === null || request.subcommand === undefined ? "" : ` ${request.subcommand}`} from the dashboard`,
		after: { command: name, subcommand: request.subcommand ?? null, args: request.args, guildId: guild?.id ?? null },
	});

	const body: CommandRunResult = {
		command: name,
		subcommand: request.subcommand ?? null,
		ranAt: new Date().toISOString(),
		outputs,
		degraded: outputs.some((output: RunOutput) => output.kind === "dropped"),
	};

	return context.json(body);
});

/**
 * A command with subcommands usually has no top-level `run`, and one without them has no subcommand to pick —
 * so a request naming the wrong one gets a sentence rather than a crash inside the command body.
 */
function pickRunner(command: Command, subcommand: string | null): Runner {
	if (subcommand !== null) {
		const found = (command.subcommands ?? []).find((candidate) => candidate.name === subcommand);
		if (found === undefined) throw badRequest(`\`${command.name}\` has no \`${subcommand}\` subcommand.`);

		// Called through its owner rather than detached, so a `run` written as a method keeps its `this`.
		return (input, client) => found.run(input, client);
	}

	if (command.run === undefined) {
		const names = (command.subcommands ?? []).map((candidate) => candidate.name).join(", ");
		throw badRequest(`Pick which part of \`${command.name}\` to run: ${names}.`);
	}

	return (input, client) => command.run!(input, client);
}

type Runner = (input: CommandInput, client: TestifyClient) => Promise<void>;

/** `guildOnly` is the command's own declaration, so the runner honours it rather than passing null and hoping. */
function resolveGuild(client: TestifyClient, command: Command, guildId: string | null): Guild | null {
	if (guildId === null) {
		if (command.guildOnly === true) throw badRequest(`\`/${command.name}\` needs a server. Pick one and try again.`);
		return null;
	}

	const guild = client.guilds.cache.get(guildId);
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

/** A command switched off is off here too. Nobody bypasses a toggle, the bot owner included. */
async function assertEnabled(name: string, guildId: string | null): Promise<void> {
	const [globally, inGuild] = await Promise.all([
		disabledGlobally(),
		guildId === null ? Promise.resolve<string[]>([]) : disabledInGuild(guildId),
	]);

	if (globally.includes(name)) throw new UserFacingError(`\`/${name}\` is switched off everywhere.`);
	if (inGuild.includes(name)) throw new UserFacingError(`\`/${name}\` is switched off in that server.`);
}
