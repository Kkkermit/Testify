import { resolve } from "node:path";
import { REST, Routes } from "discord.js";
import { globSync } from "glob";
import { isCategory } from "../config/categories";
import { type Button } from "./button";
import { type TestifyClient } from "./client";
import { buildSlashCommand, type Command, subcommandsOf } from "./command";
import { SetupError } from "./errors";
import { type AnyEvent } from "./event";
import { type MessageHandler } from "./message";

/**
 * `__dirname` is `src/core` while developing and `dist/core` after a build, and
 * both trees have the same shape. Resolving from here rather than from the
 * working directory is what lets the same code find the same files either way.
 */
const ROOT = resolve(__dirname, "..");

/**
 * A file whose name starts with `_` is a building block rather than a command —
 * something a neighbouring file imports and exposes as a subcommand. It is
 * skipped here so it does not also register on its own.
 */
function find(folder: string): string[] {
	return globSync(`${folder}/**/*.{js,ts}`, {
		cwd: ROOT,
		absolute: true,
		nodir: true,
		ignore: ["**/*.d.ts", "**/*.map", "**/*.test.*", "**/_*"],
	}).sort();
}

function importFile(file: string): unknown {
	// The one dynamic require in the codebase: it is how dropping a file into a
	// folder is enough to register a command.

	const loaded: unknown = require(file);
	if (typeof loaded === "object" && loaded !== null && "default" in loaded) {
		return loaded.default;
	}
	return loaded;
}

function fail(file: string, problem: string): never {
	throw new Error(`${file}\n  ${problem}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export interface LoadCounts {
	commands: number;
	events: number;
	buttons: number;
	messageHandlers: number;
}

/**
 * Loads everything from disk and registers it on the client. A file that is not
 * shaped correctly stops start-up and names itself, rather than failing later
 * with something unhelpful.
 */
export function loadEverything(client: TestifyClient): LoadCounts {
	return {
		commands: loadCommands(client),
		buttons: loadButtons(client),
		messageHandlers: loadMessageHandlers(client),
		events: loadEvents(client),
	};
}

function loadCommands(client: TestifyClient): number {
	for (const file of find("commands")) {
		const command = importFile(file);

		if (!isObject(command)) fail(file, "should `export default defineCommand({ … })`");
		if (typeof command.name !== "string" || !command.name) fail(file, "is missing `name`");
		if (typeof command.description !== "string" || !command.description) fail(file, "is missing `description`");
		if (typeof command.category !== "string" || !isCategory(command.category)) {
			fail(file, `has an unknown category: ${String(command.category)}`);
		}
		if (typeof command.run !== "function" && !Array.isArray(command.subcommands)) {
			fail(file, "needs either `run` or `subcommands`");
		}
		if (client.commands.has(command.name)) fail(file, `uses the command name "${command.name}" twice`);

		client.commands.set(command.name, command as unknown as Command);

		const loadedCommand = command as unknown as Command;
		const named: [string, string][] = [
			...(loadedCommand.aliases ?? []).map((alias): [string, string] => [alias, loadedCommand.name]),
			// Only aliases a subcommand asks for by name. Registering every
			// subcommand name would collide — plenty of commands have a `delete`.
			...subcommandsOf(loadedCommand).flatMap((sub) =>
				(sub.aliases ?? []).map((alias): [string, string] => [alias, `${loadedCommand.name} ${sub.name}`]),
			),
		];

		for (const [alias, target] of named) {
			if (client.commands.has(alias)) continue;
			if (client.aliases.has(alias)) fail(file, `uses the alias "${alias}", which is already taken`);
			client.aliases.set(alias, target);
		}
	}

	return client.commands.size;
}

function loadButtons(client: TestifyClient): number {
	for (const file of find("buttons")) {
		const button = importFile(file);

		if (!isObject(button)) fail(file, "should `export default defineButton({ … })`");
		if (typeof button.id !== "string" || !button.id) fail(file, "is missing `id`");
		if (typeof button.run !== "function") fail(file, "is missing `run`");
		if (client.buttons.has(button.id)) fail(file, `uses the button id "${button.id}" twice`);

		client.buttons.set(button.id, button as unknown as Button);
	}

	return client.buttons.size;
}

function loadMessageHandlers(client: TestifyClient): number {
	for (const file of find("events/message")) {
		const handler = importFile(file);

		if (!isObject(handler)) fail(file, "should `export default defineMessageHandler({ … })`");
		if (typeof handler.name !== "string" || !handler.name) fail(file, "is missing `name`");
		if (typeof handler.run !== "function") fail(file, "is missing `run`");

		client.messageHandlers.push(handler as unknown as MessageHandler);
	}

	client.messageHandlers.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
	return client.messageHandlers.length;
}

function loadEvents(client: TestifyClient): number {
	const files = find("events").filter((file) => !file.includes(`${resolve(ROOT, "events", "message")}`));
	let count = 0;

	for (const file of files) {
		const event = importFile(file);

		if (!isObject(event)) fail(file, "should `export default defineEvent({ … })`");
		if (typeof event.name !== "string" || !event.name) fail(file, "is missing `name`");
		if (typeof event.run !== "function") fail(file, "is missing `run`");

		const handler = event as unknown as AnyEvent;
		const invoke = (...args: unknown[]): void => {
			void Promise.resolve(
				(handler.run as (client: TestifyClient, ...rest: unknown[]) => Promise<void> | void)(client, ...args),
			).catch((error: unknown) => {
				client.logger.error({ err: error, event: handler.name }, "Event handler failed");
			});
		};

		if (event.once === true) client.once(handler.name, invoke);
		else client.on(handler.name, invoke);

		count += 1;
	}

	return count;
}

/**
 * Tells Discord about the commands. Set DISCORD_DEV_GUILD_ID while developing —
 * guild commands appear immediately, global ones can take up to an hour.
 */
export const MAX_COMMANDS = 100;

export async function publishCommands(client: TestifyClient): Promise<number> {
	if (client.commands.size > MAX_COMMANDS) {
		throw new SetupError(
			[
				`You have ${client.commands.size} commands and Discord allows ${MAX_COMMANDS}.`,
				"",
				"Group related ones under a shared parent rather than deleting them: rename",
				"the file with a leading `_` so the loader skips it, then expose it with",
				"`asSubcommand()` from a parent command. `src/commands/fun/fun.ts` does this.",
				"",
				"Subcommands do not count towards the limit, so one parent can hold 25.",
			].join("\n"),
		);
	}

	const body = [...client.commands.values()].map((command) => buildSlashCommand(command).toJSON());
	const rest = new REST({ version: "10" }).setToken(client.env.DISCORD_TOKEN);

	const guildId = client.env.DISCORD_DEV_GUILD_ID;
	const route = guildId
		? Routes.applicationGuildCommands(client.env.DISCORD_CLIENT_ID, guildId)
		: Routes.applicationCommands(client.env.DISCORD_CLIENT_ID);

	await rest.put(route, { body });
	client.logger.info({ count: body.length, scope: guildId ? "this server" : "all servers" }, "Published commands");

	return body.length;
}
