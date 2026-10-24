import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { reply, successEmbed } from "@lib/discord";
import { IDEA_COMMAND, ideaLink, ideaSettingsPanel, readIdeaSettings, submitIdea } from "@lib/ideas";
import { IDEA_LIMITS } from "@testify/shared";

/** The server's own idea board: members post and vote, and staff decide. `/suggest` is the bot's developers' instead. */
export default defineCommand({
	name: IDEA_COMMAND,
	description: "Posts an idea for this server, for members to vote on.",
	category: "community",
	guildOnly: true,
	subcommands: [
		{
			name: "submit",
			description: "Posts your idea to this server's idea board.",
			private: true,
			options: [
				{
					name: "idea",
					description: "What you would like to see.",
					type: "string",
					required: true,
					maxLength: IDEA_LIMITS.maxText,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const idea = await submitIdea(
					guild,
					{ id: interaction.user.id, username: interaction.user.username },
					interaction.options.getString("idea", true),
				);

				const link = ideaLink(idea);
				await reply(interaction, {
					embeds: [successEmbed(`Posted as idea #${String(idea.number)}${link === null ? "." : `: ${link}`}`)],
				});
			},
		},
		{
			name: "settings",
			description: "Turns the idea board on or off, and picks where ideas are posted.",
			private: true,
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const guild = inGuild(interaction);

				await reply(interaction, ideaSettingsPanel(await readIdeaSettings(guild), interaction.user.id));
			},
		},
	],
});
