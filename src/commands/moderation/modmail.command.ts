import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { conversationByThread } from "@database/repositories/modmailRepository";
import { reply, successEmbed } from "@lib/discord";
import { closeModmail, MODMAIL_COMMAND, modmailSettingsPanel, readModmailSettings, writePanel } from "@lib/modmail";

export default defineCommand({
	name: MODMAIL_COMMAND,
	description: "Lets members write privately to the server's staff, in threads only staff can see.",
	category: "moderation",
	guildOnly: true,
	subcommands: [
		{
			name: "open",
			description: "Writes to this server's staff. Their replies come to you in a direct message.",
			private: true,
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await readModmailSettings(guild);
				if (!settings.enabled) throw new UserFacingError("This server does not take mod mail.");

				await reply(interaction, writePanel(guild.name, guild.id, interaction.user.id));
			},
		},
		{
			name: "close",
			description: "Closes the mod mail conversation in this thread.",
			permissions: [PermissionFlagsBits.ManageMessages],
			async run(interaction, client) {
				const guild = inGuild(interaction);
				const conversation =
					interaction.channel?.isThread() === true ? await conversationByThread(interaction.channel.id) : null;
				if (conversation?.guildId !== guild.id) {
					throw new UserFacingError("Run this inside an open mod mail thread.");
				}

				await closeModmail(
					client,
					guild.id,
					conversation.id,
					{ id: interaction.user.id, name: interaction.user.username },
					"staff",
				);
				await reply(interaction, { embeds: [successEmbed("🔒 Closed. They have been told.")] });
			},
		},
		{
			name: "settings",
			description: "Picks where mod mail threads go, who is pinged and how replies are signed.",
			private: true,
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const guild = inGuild(interaction);
				await reply(interaction, modmailSettingsPanel(await readModmailSettings(guild), interaction.user.id));
			},
		},
	],
});
