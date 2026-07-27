import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { disableWelcome, getWelcome, setWelcome } from "@database/repositories/settingsRepository";
import { embed, successEmbed } from "@lib/embeds";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "welcome-system",
	description: "Greets new members when they join.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages],
	subcommands: [
		{
			name: "set",
			description: "Configure the welcome message.",
			options: [
				{
					name: "channel",
					description: "Where to post the greeting.",
					type: "channel",
					required: true,
				},
				{
					name: "message",
					description: "The message. Use {user}, {server} and {count} as placeholders.",
					type: "string",
					required: true,
					maxLength: 1_500,
				},
				{ name: "embed", description: "Send the greeting as an embed.", type: "boolean" },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				await setWelcome(
					guild.id,
					channel.id,
					interaction.options.getString("message", true),
					interaction.options.getBoolean("embed") ?? false,
				);

				await reply(interaction, { embeds: [successEmbed(`New members will be greeted in ${channel}.`)] });
			},
		},
		{
			name: "remove",
			description: "Stop greeting new members.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await disableWelcome(guild.id);
				if (!removed) throw new UserFacingError("The welcome system is not set up here.");
				await reply(interaction, { embeds: [successEmbed("The welcome system has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the current welcome configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getWelcome(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Welcome system",
							description: settings ? `Enabled in <#${settings.channelId}>.\n\n> ${settings.message}` : "Disabled.",
							...(settings ? { fields: [{ name: "Embed mode", value: settings.isEmbed ? "On" : "Off" }] } : {}),
						}),
					],
				});
			},
		},
	],
});
