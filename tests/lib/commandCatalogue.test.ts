import { PermissionFlagsBits } from "discord.js";
import { type Command } from "@core/command";
import { buildCatalogue, summariseCommand } from "@lib/commandCatalogue.util";

function aCommand(overrides: Partial<Command> = {}): Command {
	return {
		name: "ping",
		description: "Checks the bot is awake.",
		category: "info",
		async run() {
			/* not run here */
		},
		...overrides,
	};
}

describe("summariseCommand", () => {
	it("fills every optional field rather than leaving it undefined", () => {
		const summary = summariseCommand(aCommand());

		expect(summary).toMatchObject({
			aliases: [],
			subcommands: [],
			options: [],
			permissions: [],
			cooldownMs: null,
			guildOnly: false,
			ownerOnly: false,
			nsfw: false,
		});
	});

	/**
	 * A raw bit flag means nothing to a reader. `humanisePermission` lowercases on purpose, so the name reads as
	 * part of a sentence — "Needs ban members" — rather than as a shouted proper noun.
	 */
	it("resolves permission bits to readable names", () => {
		const summary = summariseCommand(aCommand({ permissions: [PermissionFlagsBits.BanMembers] }));

		expect(summary.permissions).toEqual(["ban members"]);
	});

	it("carries subcommands with their own options and prefix aliases", () => {
		const summary = summariseCommand(
			aCommand({
				name: "fun",
				subcommands: [
					{
						name: "dad-joke",
						description: "Tells one.",
						aliases: ["dadjoke"],
						options: [{ name: "category", description: "Which sort.", type: "string", required: true }],
						async run() {
							/* not run here */
						},
					},
				],
			}),
		);

		expect(summary.subcommands[0]).toMatchObject({
			name: "dad-joke",
			aliases: ["dadjoke"],
			options: [expect.objectContaining({ name: "category", required: true })],
		});
	});

	it("keeps an option's bounds and choices, which a generated form would need", () => {
		const summary = summariseCommand(
			aCommand({
				options: [
					{
						name: "amount",
						description: "How much.",
						type: "integer",
						min: 1,
						max: 100,
						choices: [{ name: "All", value: 100 }],
					},
				],
			}),
		);

		expect(summary.options[0]).toMatchObject({ min: 1, max: 100, choices: [{ name: "All", value: 100 }] });
	});
});

describe("buildCatalogue", () => {
	const commands = [
		aCommand({ name: "ping", category: "info" }),
		aCommand({ name: "ban", category: "moderation" }),
		aCommand({ name: "eval", category: "owner", ownerOnly: true }),
	];

	/**
	 * The list of what a bot's owner can do is not something a server manager needs, and naming the commands
	 * invites probing at them.
	 */
	it("hides owner commands from everybody else", () => {
		const catalogue = buildCatalogue(commands, { prefix: "t?", includeOwnerOnly: false });

		expect(catalogue.commands.map((command) => command.name)).toEqual(["ban", "ping"]);
		expect(catalogue.categories).not.toContain("owner");
	});

	it("shows them to the bot owner", () => {
		const catalogue = buildCatalogue(commands, { prefix: "t?", includeOwnerOnly: true });

		expect(catalogue.commands.map((command) => command.name)).toContain("eval");
	});

	it("sorts by name, so the page does not reorder between restarts", () => {
		const names = buildCatalogue(commands, { prefix: "t?", includeOwnerOnly: true }).commands.map((c) => c.name);

		expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
	});

	it("lists each category once, sorted", () => {
		expect(buildCatalogue(commands, { prefix: "t?", includeOwnerOnly: true }).categories).toEqual([
			"info",
			"moderation",
			"owner",
		]);
	});

	it("carries the prefix, so the page can show what t?ban would be", () => {
		expect(buildCatalogue(commands, { prefix: "!", includeOwnerOnly: false }).prefix).toBe("!");
	});

	it("copes with a bot that has no commands loaded at all", () => {
		expect(buildCatalogue([], { prefix: "t?", includeOwnerOnly: true })).toEqual({
			commands: [],
			categories: [],
			prefix: "t?",
		});
	});
});
