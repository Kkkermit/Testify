import { PermissionFlagsBits } from "discord.js";
import { type Command } from "@core/command";
import { buildCatalogue, summariseCommand } from "@lib/bot/commandCatalogue.util";

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
	/** Discord's flag names, so each surface can word a permission in its own language. */
	it("resolves permission bits to their flag names", () => {
		const summary = summariseCommand(aCommand({ permissions: [PermissionFlagsBits.BanMembers] }));

		expect(summary.permissions).toEqual(["BanMembers"]);
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
});

describe("buildCatalogue", () => {
	const commands = [
		aCommand({ name: "ping", category: "info" }),
		aCommand({ name: "ban", category: "moderation" }),
		aCommand({ name: "eval", category: "owner", ownerOnly: true }),
	];

	/** Owner commands are hidden from everybody else. */
	it("hides owner commands from everybody else", () => {
		const catalogue = buildCatalogue(commands, { prefix: "t?", includeOwnerOnly: false });

		expect(catalogue.commands.map((command) => command.name)).toEqual(["ban", "ping"]);
		expect(catalogue.categories).not.toContain("owner");
	});
});
