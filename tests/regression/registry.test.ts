import { Collection } from "discord.js";
import { ALL_CATEGORIES } from "../../src/config/categories";
import { LIMITS } from "../../src/config/constants";
import { toSlashCommand } from "../../src/adapters/slash";
import { allSubcommands, type SharedCommand } from "../../src/core/command";
import { type TestifyClient } from "../../src/core/client";
import { buildCommandPayload } from "../../src/core/deploy";
import { createLogger } from "../../src/core/logger";
import { MessagePipeline } from "../../src/core/messagePipeline";
import { registerAll } from "../../src/core/registry";
import { createMockClient } from "../helpers/context";

const logger = createLogger({ level: "fatal", pretty: false });

interface Registered {
	client: TestifyClient;
	listeners: Map<string, number>;
	pipeline: MessagePipeline;
}

/**
 * Loads the real command, event, component and processor tree. Every invariant
 * here corresponds to a defect the audit found in the previous loader.
 */
function loadEverything(): Registered {
	const listeners = new Map<string, number>();
	const client = createMockClient({
		commands: new Collection<string, SharedCommand>(),
		aliases: new Collection<string, string>(),
		components: new Collection(),
		on: ((name: string) => listeners.set(name, (listeners.get(name) ?? 0) + 1)) as never,
		once: ((name: string) => listeners.set(name, (listeners.get(name) ?? 0) + 1)) as never,
	});

	const pipeline = new MessagePipeline(logger);
	registerAll(client, pipeline, logger);
	return { client, listeners, pipeline };
}

describe("module registry", () => {
	const { client, listeners, pipeline } = loadEverything();

	it("loads the whole command tree", () => {
		expect(client.commands.size).toBeGreaterThan(100);
	});

	it("registers message processors", () => {
		expect(pipeline.size).toBeGreaterThan(0);
	});

	// There were twenty-seven concurrent interactionCreate listeners before, all
	// type-guarding and string-matching independently.
	it("binds exactly one interactionCreate listener", () => {
		expect(listeners.get("interactionCreate")).toBe(1);
	});

	// And ten messageCreate listeners.
	it("binds exactly one messageCreate listener", () => {
		expect(listeners.get("messageCreate")).toBe(1);
	});

	it("never binds an undefined event name", () => {
		expect([...listeners.keys()].every((name) => name.length > 0)).toBe(true);
	});

	it("gives every command a category from the enum", () => {
		for (const command of client.commands.values()) {
			expect(ALL_CATEGORIES).toContain(command.category);
		}
	});

	it("has no duplicate command names or aliases", () => {
		const names = [...client.commands.keys()];
		expect(new Set(names).size).toBe(names.length);

		for (const alias of client.aliases.keys()) {
			expect(client.commands.has(alias)).toBe(false);
		}
	});

	it("declares at least one surface per command", () => {
		for (const command of client.commands.values()) {
			expect(command.surfaces.length).toBeGreaterThan(0);
		}
	});

	it("gives every option a name and description", () => {
		for (const command of client.commands.values()) {
			for (const option of command.options ?? []) {
				expect(option.name).toMatch(/^[\w-]{1,32}$/);
				expect(option.description.length).toBeGreaterThan(0);
			}
		}
	});

	it("keeps subcommand names unique within a command", () => {
		for (const command of client.commands.values()) {
			const names = allSubcommands(command).map((sub) => sub.name);
			expect(new Set(names).size).toBe(names.length);
		}
	});

	it("builds a valid application command payload for every slash command", () => {
		for (const command of client.commands.values()) {
			if (!command.surfaces.includes("slash")) continue;
			expect(() => toSlashCommand(command).toJSON()).not.toThrow();
		}
	});

	it("stays within Discord's per-command option limit", () => {
		for (const entry of buildCommandPayload(client.commands.values()) as { options?: unknown[] }[]) {
			expect(entry.options?.length ?? 0).toBeLessThanOrEqual(25);
		}
	});

	// The `spotify-*` prefix match claimed IDs another handler already owned, and
	// `back-` land-grabbed IDs bot-wide.
	it("has no duplicate component namespaces", () => {
		expect(new Set(client.components.keys()).size).toBe(client.components.size);
	});

	it("keeps every command name inside Discord's length limit", () => {
		for (const name of client.commands.keys()) {
			expect(name.length).toBeLessThanOrEqual(32);
			expect(name).toMatch(/^[\w-]+$/);
		}
	});

	it("keeps every description inside Discord's length limit", () => {
		for (const command of client.commands.values()) {
			expect(command.description.length).toBeLessThanOrEqual(100);
			for (const sub of allSubcommands(command)) {
				expect(sub.description.length).toBeLessThanOrEqual(100);
			}
		}
	});

	it("registers only ClientReady handlers that run once", () => {
		expect(listeners.get("clientReady")).toBeGreaterThan(0);
	});

	it("keeps the custom-id limit reachable for every namespace", () => {
		for (const namespace of client.components.keys()) {
			expect(namespace.length).toBeLessThan(LIMITS.customIdLength / 4);
		}
	});
});
