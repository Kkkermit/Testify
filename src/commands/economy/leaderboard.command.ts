import { type CommandInput, defineCommand, inGuild } from "@core/command";
import { type BoardKind, boardMessage } from "@lib/leaderboardActions.util";
import { reply } from "@lib/reply.util";

/**
 * Both boards, one command, and no buttons.
 *
 * The board used to page and swap from buttons, but re-rendering it left the old
 * image attached and added the new one beside it — a few presses produced a grid of
 * four boards. A message that is never edited cannot accumulate anything, so the
 * page is an option and each request is its own message.
 */
const pageOption = {
	name: "page",
	description: "Which page to show. Defaults to the first.",
	type: "integer",
	min: 1,
	max: 1_000,
} as const;

async function show(interaction: CommandInput, kind: BoardKind): Promise<void> {
	const guild = inGuild(interaction);
	const page = Math.max(0, (interaction.options.getInteger("page") ?? 1) - 1);

	// Drawing the board and fetching avatars takes longer than the three seconds
	// Discord allows before the interaction expires.
	await interaction.deferReply();
	await reply(interaction, await boardMessage(guild, kind, page, interaction.user.id));
}

export default defineCommand({
	name: "leaderboard",
	description: "Shows the server leaderboards.",
	category: "economy",
	aliases: ["lb", "top"],
	guildOnly: true,
	subcommands: [
		{
			name: "economy",
			description: "Richest members in this server.",
			options: [pageOption],
			async run(interaction) {
				await show(interaction, "economy");
			},
		},
		{
			name: "levels",
			description: "Highest levels in this server.",
			options: [pageOption],
			async run(interaction) {
				await show(interaction, "levels");
			},
		},
	],

	async run(interaction) {
		await show(interaction, "economy");
	},
});
