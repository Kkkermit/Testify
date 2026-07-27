import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { listSticky, removeSticky, setSticky } from "@database/repositories/settingsRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "sticky-message",
	description: "Keeps a message pinned to the bottom of a channel.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
	subcommands: [
		{
			name: "setup",
			description: "Set the sticky message for a channel.",
			options: [
				{
					name: "channel",
					description: "The channel to stick the message in.",
					type: "channel",
					required: true,
				},
				{
					name: "message",
					description: "The message to keep visible.",
					type: "string",
					required: true,
					maxLength: 1_500,
				},
				{
					name: "cap",
					description: "How many messages before it reposts (1-50).",
					type: "integer",
					required: true,
					min: 1,
					max: 50,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				const message = interaction.options.getString("message", true);
				await setSticky(guild.id, channel.id, message, interaction.options.getInteger("cap", true));

				await reply(interaction, { embeds: [successEmbed(`Sticky message set for ${channel}.`)] });
			},
		},
		{
			name: "disable",
			description: "Remove the sticky message from a channel.",
			options: [
				{
					name: "channel",
					description: "The channel to clear.",
					type: "channel",
					required: true,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel) throw new UserFacingError("I could not find that channel.");

				const removed = await removeSticky(guild.id, channel.id);
				if (!removed) throw new UserFacingError("There is no sticky message in that channel.");

				await reply(interaction, { embeds: [successEmbed(`Sticky message removed from ${channel}.`)] });
			},
		},
		{
			name: "check",
			description: "List the active sticky messages.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const all = await listSticky(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: `Sticky messages (${all.length})`,
							description:
								all
									.map(
										(entry) => `<#${entry.channelId}> — every ${entry.cap} messages\n> ${truncate(entry.message, 80)}`,
									)
									.join("\n\n") || "None configured.",
						}),
					],
				});
			},
		},
	],
});
