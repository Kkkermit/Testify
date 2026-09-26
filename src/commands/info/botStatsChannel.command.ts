import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply, successEmbed } from "@lib/discord";
import { postBotStats, removeBotStats } from "@lib/info";

export default defineCommand({
	name: "bot-stats-channel",
	description: "Posts a self-updating bot statistics message in a channel.",
	category: "info",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
	subcommands: [
		{
			name: "set",
			description: "Choose the channel for the statistics message.",
			options: [
				{
					name: "channel",
					description: "The channel to post in.",
					type: "channel",
					required: true,
				},
			],
			async run(interaction, client) {
				const channel = textChannelOption(interaction, "channel");
				if (channel === null) throw new UserFacingError("Pick a text channel I can send messages in.");

				await postBotStats(client, inGuild(interaction), channel.id, interaction.user.id);

				await reply(interaction, {
					embeds: [successEmbed(`Bot statistics will now be posted in ${channel}.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "remove",
			description: "Stop posting the statistics message.",
			async run(interaction, client) {
				if (!(await removeBotStats(client, inGuild(interaction).id))) {
					throw new UserFacingError("There is no statistics message configured here.");
				}

				await reply(interaction, {
					embeds: [successEmbed("The statistics message has been removed.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
