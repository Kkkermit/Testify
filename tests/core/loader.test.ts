import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Collection } from "discord.js";
import { CATEGORIES } from "@config/categories";
import { type TestifyClient } from "@core/client";
import { buildSlashCommand, subcommandsOf } from "@core/command";
import { loadEverything, MAX_COMMANDS } from "@core/loader";
import { createLogger } from "@core/logger";

/**
 * Loads every command, button, event and message handler from disk. If a file
 * is malformed — a bad category, a missing `run`, a duplicate name — this fails
 * here rather than at start-up in production.
 */
const bound: string[] = [];

function fakeClient(): TestifyClient {
	return {
		commands: new Collection(),
		aliases: new Collection(),
		buttons: new Collection(),
		messageHandlers: [],
		logger: createLogger("fatal", false),
		on: (name: string) => bound.push(name),
		once: (name: string) => bound.push(name),
	} as unknown as TestifyClient;
}

const client = fakeClient();
const counts = loadEverything(client);

describe("loadEverything", () => {
	it("finds the modules on disk", () => {
		expect(counts.commands).toBeGreaterThan(0);
		expect(counts.buttons).toBeGreaterThan(0);
		expect(counts.events).toBeGreaterThan(0);
		expect(counts.messageHandlers).toBeGreaterThan(0);
	});

	/**
	 * Every file in `events/` has to end up on the client. A path filter meant to
	 * skip the `events/message/` folder also matched `events/messageCreate.ts`,
	 * so nothing ran on a message at all and no prefix command worked.
	 */
	it("binds a listener for every event file", () => {
		expect(counts.events).toBe(
			readdirSync(resolve(__dirname, "../../src/events"), { withFileTypes: true }).filter((entry) => entry.isFile())
				.length,
		);
	});

	it("binds the listeners the message handlers depend on", () => {
		expect(bound).toContain("messageCreate");
	});

	it("sorts message handlers by their order", () => {
		const orders = client.messageHandlers.map((handler) => handler.order ?? 100);
		expect([...orders].sort((a, b) => a - b)).toEqual(orders);
	});
});

describe("every command", () => {
	const commands = [...client.commands.values()];

	it.each(commands.map((command) => [command.name, command] as const))("%s is valid", (_name, command) => {
		expect(command.name).toMatch(/^[a-z0-9-]{1,32}$/);
		expect(command.description.length).toBeGreaterThan(0);
		expect(command.description.length).toBeLessThanOrEqual(100);
		expect(Object.keys(CATEGORIES)).toContain(command.category);
	});

	it.each(commands.map((command) => [command.name, command] as const))(
		"%s builds a payload Discord accepts",
		(_name, command) => {
			expect(() => buildSlashCommand(command).toJSON()).not.toThrow();
		},
	);

	it("never mixes top-level options with subcommands", () => {
		const mixed = commands.filter((command) => subcommandsOf(command).length > 0 && (command.options?.length ?? 0) > 0);
		expect(mixed.map((command) => command.name)).toEqual([]);
	});

	it("puts every command in the folder its category names", () => {
		expect(commands.filter((command) => !(command.category in CATEGORIES))).toEqual([]);
	});
});

describe("prefix aliases", () => {
	it("never shadows a real command name", () => {
		for (const [alias] of client.aliases) expect(client.commands.has(alias)).toBe(false);
	});

	it("is unique across the whole bot", () => {
		expect(new Set(client.aliases.keys()).size).toBe(client.aliases.size);
	});

	it("points at a command, or a subcommand, that exists", () => {
		for (const [, target] of client.aliases) {
			const [name = "", subcommand] = target.split(" ");
			const command = client.commands.get(name);

			expect(command).toBeDefined();
			if (subcommand !== undefined) {
				expect(subcommandsOf(command!).map((sub) => sub.name)).toContain(subcommand);
			}
		}
	});
});

describe("every command's options", () => {
	const commands = [...client.commands.values()];

	/**
	 * A prefix command fills options by position, and only the last string option
	 * can swallow the rest of the message. A required option sitting after an
	 * optional one can therefore never be filled.
	 */
	it("never puts a required option after an optional one", () => {
		const offenders: string[] = [];

		for (const command of commands) {
			const groups: [string, typeof command.options][] = [
				[command.name, command.options],
				...subcommandsOf(command).map(
					(sub) => [`${command.name} ${sub.name}`, sub.options] as [string, typeof sub.options],
				),
			];

			for (const [label, options] of groups) {
				const firstOptional = (options ?? []).findIndex((option) => option.required !== true);
				const lastRequired = (options ?? []).map((option) => option.required === true).lastIndexOf(true);

				if (firstOptional !== -1 && lastRequired !== -1 && lastRequired > firstOptional) offenders.push(label);
			}
		}

		expect(offenders).toEqual([]);
	});
});

describe("the command count", () => {
	/**
	 * Discord refuses to publish more than this, and refuses the whole batch — so
	 * going over does not break one command, it breaks the bot. Group related
	 * commands under a parent with `asSubcommand()` rather than deleting them.
	 */
	it(`is within Discord's limit of ${MAX_COMMANDS}`, () => {
		expect(client.commands.size).toBeLessThanOrEqual(MAX_COMMANDS);
	});
});

describe("every button", () => {
	it("has a unique id with no separator in it", () => {
		for (const [id] of client.buttons) expect(id).not.toContain(":");
		expect(new Set(client.buttons.keys()).size).toBe(client.buttons.size);
	});
});
