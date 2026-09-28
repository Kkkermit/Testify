import { type TestifyClient } from "@core/client";
import { type CommandInput, defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { type BoardKind, boardMessage } from "@lib/economy";
import { type BoardScope, type MoneySort } from "@testify/shared";

/** Both boards, one command, and no buttons: each request is its own message, so nothing can stack. */
const pageOption = {
	name: "page",
	description: "Which page to show. Defaults to the first.",
	type: "integer",
	min: 1,
	max: 1_000,
} as const;

async function show(interaction: CommandInput, client: TestifyClient, kind: BoardKind): Promise<void> {
	const guild = inGuild(interaction);
	const page = Math.max(0, (interaction.options.getInteger("page") ?? 1) - 1);
	// A prefix command can type anything here, so an unknown word falls back rather than failing.
	const rawSort = interaction.options.getString("sort")?.toLowerCase();
	const sort: MoneySort = rawSort === "wallet" || rawSort === "bank" ? rawSort : "total";
	const scope: BoardScope = interaction.options.getString("scope")?.toLowerCase() === "global" ? "global" : "server";

	// Drawing the board and fetching avatars outlasts Discord's three-second window.
	await interaction.deferReply();
	await reply(
		interaction,
		await boardMessage(guild, { kind, page, sort, scope }, interaction.user.id, [...client.guilds.cache.keys()]),
	);
}

export default defineCommand({
	name: "leaderboard",
	description: "Shows the leaderboards, for this server or every server.",
	category: "economy",
	aliases: ["lb", "top"],
	guildOnly: true,
	subcommands: [
		{
			name: "economy",
			description: "The richest people, in this server or across every server.",
			options: [
				pageOption,
				{
					name: "sort",
					description: "Rank by wallet and bank together, or by one of them.",
					type: "string",
					choices: [
						{ name: "Total", value: "total" },
						{ name: "Wallet", value: "wallet" },
						{ name: "Bank", value: "bank" },
					],
				},
				{
					name: "scope",
					description: "This server, or everybody's money across every server the bot is in.",
					type: "string",
					choices: [
						{ name: "This server", value: "server" },
						{ name: "Every server", value: "global" },
					],
				},
			],
			async run(interaction, client) {
				await show(interaction, client, "economy");
			},
		},
		{
			name: "levels",
			description: "Highest levels in this server.",
			options: [pageOption],
			async run(interaction, client) {
				await show(interaction, client, "levels");
			},
		},
	],

	async run(interaction, client) {
		await show(interaction, client, "economy");
	},
});
