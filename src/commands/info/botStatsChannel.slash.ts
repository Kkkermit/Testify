import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getFixedStats, removeFixedStats, setFixedStats } from "@database/repositories/settingsRepository";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";
import { botStatsEmbed } from "@lib/statsEmbed.util";

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
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				const guild = inGuild(interaction);
				const existing = await getFixedStats(guild.id);
				if (existing) {
					const previous = await client.channels.fetch(existing.channelId).catch(() => null);
					if (previous?.isTextBased()) {
						await previous.messages.delete(existing.messageId).catch(() => null);
					}
				}

				const message = await channel.send({ embeds: [botStatsEmbed(client)] });
				await setFixedStats(guild.id, channel.id, message.id, interaction.user.id);

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
				const guild = inGuild(interaction);
				const existing = await getFixedStats(guild.id);
				if (!existing) throw new UserFacingError("There is no statistics message configured here.");

				const channel = await client.channels.fetch(existing.channelId).catch(() => null);
				if (channel?.isTextBased()) await channel.messages.delete(existing.messageId).catch(() => null);

				await removeFixedStats(guild.id);
				await reply(interaction, {
					embeds: [successEmbed("The statistics message has been removed.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
