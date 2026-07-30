import { defineCommand, inGuild } from "@core/command";
import { type BoardKind, boardMessage } from "@lib/leaderboardActions.util";
import { reply } from "@lib/reply.util";

/**
 * Both boards, one command. The levelling board used to be a second subcommand of
 * an economy command, which is the last place anyone would look for it, and the
 * top-level `run` was a verbatim copy of the economy subcommand's body.
 */
async function show(interaction: Parameters<typeof reply>[0], kind: BoardKind): Promise<void> {
	const guild = inGuild(interaction);
	await interaction.deferReply();
	await reply(interaction, await boardMessage(guild, kind, 0, interaction.user.id));
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
			async run(interaction) {
				await show(interaction, "economy");
			},
		},
		{
			name: "levels",
			description: "Highest levels in this server.",
			async run(interaction) {
				await show(interaction, "levels");
			},
		},
	],

	async run(interaction) {
		await show(interaction, "economy");
	},
});
