import { type TestifyClient } from "@core/client";
import { type CommandInput, defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { type BoardKind, boardMessage } from "@lib/economy";
import { type BoardScope, type MoneySort } from "@testify/shared";

/** Both boards as one picture of the top ten; the money board's buttons change what it ranks and where. */
async function show(interaction: CommandInput, client: TestifyClient, kind: BoardKind): Promise<void> {
	const guild = inGuild(interaction);
	// A prefix command can type anything here, so an unknown word falls back rather than failing.
	const rawSort = interaction.options.getString("sort")?.toLowerCase();
	const sort: MoneySort = rawSort === "wallet" || rawSort === "bank" ? rawSort : "total";
	const scope: BoardScope = interaction.options.getString("scope")?.toLowerCase() === "global" ? "global" : "server";

	// Drawing the board and fetching avatars outlasts Discord's three-second window.
	await interaction.deferReply();
	await reply(
		interaction,
		await boardMessage(guild, { kind, sort, scope }, interaction.user.id, [...client.guilds.cache.keys()]),
	);
}

export default defineCommand({
	name: "leaderboard",
	description: "Shows the top ten, by money or by level.",
	category: "economy",
	aliases: ["lb", "top"],
	guildOnly: true,
	subcommands: [
		{
			name: "economy",
			description: "The ten richest people, in this server or across every server.",
			options: [
				{
					name: "scope",
					description: "Where to start: this server, or everybody's money across every server.",
					type: "string",
					choices: [
						{ name: "This server", value: "server" },
						{ name: "Every server", value: "global" },
					],
				},
				{
					name: "sort",
					description: "What to start ranked by: wallet and bank together, or one of them.",
					type: "string",
					choices: [
						{ name: "Total", value: "total" },
						{ name: "Wallet", value: "wallet" },
						{ name: "Bank", value: "bank" },
					],
				},
			],
			async run(interaction, client) {
				await show(interaction, client, "economy");
			},
		},
		{
			name: "levels",
			description: "The ten highest levels in this server.",
			async run(interaction, client) {
				await show(interaction, client, "levels");
			},
		},
	],

	async run(interaction, client) {
		await show(interaction, client, "economy");
	},
});
