import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../src/config/categories";
import { type SharedCommand } from "../../src/core/command";
import { toSlashCommand } from "../../src/adapters/slash";
import { buildCommandPayload } from "../../src/core/deploy";

function command(overrides: Partial<SharedCommand> = {}): SharedCommand {
	return {
		name: "sample",
		description: "A sample command.",
		category: Category.Fun,
		surfaces: ["slash"],
		execute: async () => undefined,
		...overrides,
	};
}

describe("toSlashCommand", () => {
	it("carries the name and description through", () => {
		const json = toSlashCommand(command()).toJSON();
		expect(json.name).toBe("sample");
		expect(json.description).toBe("A sample command.");
	});

	it("translates every option type", () => {
		const json = toSlashCommand(
			command({
				options: [
					{ name: "text", description: "d", type: "string", required: true },
					{ name: "count", description: "d", type: "integer", minValue: 1, maxValue: 10 },
					{ name: "flag", description: "d", type: "boolean" },
					{ name: "who", description: "d", type: "user" },
					{ name: "where", description: "d", type: "channel" },
					{ name: "what", description: "d", type: "role" },
					{ name: "file", description: "d", type: "attachment" },
				],
			}),
		).toJSON();

		expect(json.options?.map((option) => option.type)).toEqual([
			ApplicationCommandOptionType.String,
			ApplicationCommandOptionType.Integer,
			ApplicationCommandOptionType.Boolean,
			ApplicationCommandOptionType.User,
			ApplicationCommandOptionType.Channel,
			ApplicationCommandOptionType.Role,
			ApplicationCommandOptionType.Attachment,
		]);
	});

	it("marks required options", () => {
		const json = toSlashCommand(
			command({ options: [{ name: "text", description: "d", type: "string", required: true }] }),
		).toJSON();

		expect((json.options?.[0] as { required?: boolean }).required).toBe(true);
	});

	it("builds subcommands with their own options", () => {
		const json = toSlashCommand(
			command({
				subcommands: [
					{
						name: "add",
						description: "Add something.",
						options: [{ name: "value", description: "d", type: "string", required: true }],
						execute: async () => undefined,
					},
				],
			}),
		).toJSON();

		const [sub] = json.options ?? [];
		expect(sub?.type).toBe(ApplicationCommandOptionType.Subcommand);
		expect((sub as { options?: unknown[] }).options).toHaveLength(1);
	});

	it("restricts a guild-only command to guild contexts", () => {
		expect(toSlashCommand(command({ guildOnly: true })).toJSON().contexts).toEqual([0]);
	});

	it("allows DMs for a command that is not guild-only", () => {
		expect(toSlashCommand(command()).toJSON().contexts).toEqual([0, 1, 2]);
	});

	it("sets default member permissions from the declared permissions", () => {
		const json = toSlashCommand(command({ permissions: [PermissionFlagsBits.BanMembers] })).toJSON();
		expect(json.default_member_permissions).toBe(String(PermissionFlagsBits.BanMembers));
	});

	it("prefers autocomplete over static choices", () => {
		const json = toSlashCommand(
			command({
				options: [
					{
						name: "item",
						description: "d",
						type: "string",
						autocomplete: true,
						choices: [{ name: "a", value: "a" }],
					},
				],
			}),
		).toJSON();

		const option = json.options?.[0] as { autocomplete?: boolean; choices?: unknown[] };
		expect(option.autocomplete).toBe(true);
		expect(option.choices).toBeUndefined();
	});
});

describe("buildCommandPayload", () => {
	it("omits prefix-only commands", () => {
		const payload = buildCommandPayload([
			command({ name: "slash-one" }),
			command({ name: "prefix-only", surfaces: ["prefix"] }),
		]) as { name: string }[];

		expect(payload.map((entry) => entry.name)).toEqual(["slash-one"]);
	});
});
