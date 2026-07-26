import { type Message } from "discord.js";
import { Category } from "../../src/config/categories";
import { createPrefixContext } from "../../src/adapters/prefix";
import { type SharedCommand } from "../../src/core/command";
import { createMockClient } from "../helpers/context";

function message(): Message {
	return {
		guild: null,
		author: { id: "1", bot: false },
		member: null,
		channel: { id: "2", isSendable: () => true },
		attachments: { first: () => undefined },
		content: "",
		reply: () => Promise.resolve({} as Message),
	} as unknown as Message;
}

function command(overrides: Partial<SharedCommand> = {}): SharedCommand {
	return {
		name: "sample",
		description: "d",
		category: Category.Fun,
		surfaces: ["prefix"],
		execute: async () => undefined,
		...overrides,
	};
}

describe("prefix option parsing", () => {
	it("maps positional arguments in declaration order", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({
				options: [
					{ name: "first", description: "d", type: "string" },
					{ name: "second", description: "d", type: "integer" },
				],
			}),
			["hello", "42"],
		);

		expect(ctx.options.getString("first")).toBe("hello");
		expect(ctx.options.getInteger("second")).toBe(42);
	});

	it("lets a greedy string swallow the rest of the line", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({ options: [{ name: "reason", description: "d", type: "string", greedy: true }] }),
			["spamming", "in", "general"],
		);

		expect(ctx.options.getString("reason")).toBe("spamming in general");
	});

	it("parses boolean words in both directions", async () => {
		const definition = command({ options: [{ name: "enabled", description: "d", type: "boolean" }] });
		const client = createMockClient();

		const yes = await createPrefixContext(client, message(), definition, ["yes"]);
		const no = await createPrefixContext(client, message(), definition, ["off"]);

		expect(yes.options.getBoolean("enabled")).toBe(true);
		expect(no.options.getBoolean("enabled")).toBe(false);
	});

	it("returns null for an option that was not supplied", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({ options: [{ name: "text", description: "d", type: "string" }] }),
			[],
		);

		expect(ctx.options.getString("text")).toBeNull();
	});

	it("throws for a missing required option", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({ options: [{ name: "text", description: "d", type: "string" }] }),
			[],
		);

		expect(() => ctx.options.getString("text", true)).toThrow(/Missing required argument/);
	});

	it("recognises a subcommand and parses its own options", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({
				subcommands: [
					{
						name: "add",
						description: "d",
						options: [{ name: "value", description: "d", type: "string" }],
						execute: async () => undefined,
					},
					{ name: "remove", description: "d", execute: async () => undefined },
				],
			}),
			["add", "thing"],
		);

		expect(ctx.options.getSubcommand()).toBe("add");
		expect(ctx.options.getString("value")).toBe("thing");
	});

	// A prefix-only command whose slash counterpart uses subcommands still needs
	// to work when invoked bare.
	it("falls back to the first subcommand when none is named", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({
				subcommands: [
					{ name: "economy", description: "d", execute: async () => undefined },
					{ name: "levels", description: "d", execute: async () => undefined },
				],
			}),
			[],
		);

		expect(ctx.options.getSubcommand()).toBe("economy");
	});

	it("exposes leftover text through rest()", async () => {
		const ctx = await createPrefixContext(
			createMockClient(),
			message(),
			command({ options: [{ name: "first", description: "d", type: "string" }] }),
			["one", "two", "three"],
		);

		expect(ctx.options.rest()).toBe("two three");
	});

	it("reports the prefix surface", async () => {
		const ctx = await createPrefixContext(createMockClient(), message(), command(), []);
		expect(ctx.surface).toBe("prefix");
		expect(ctx.deferred).toBe(false);
	});
});
