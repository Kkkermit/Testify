import { ButtonStyle, MessageFlags, PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { defineCommand, inGuild, roleOption, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deleteVerifyConfig, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { button, row } from "@lib/components.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "verify",
	description: "Configures the verification system.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	subcommands: [
		{
			name: "setup",
			description: "Post the verification panel.",
			options: [
				{ name: "role", description: "The role given once verified.", type: "role", required: true },
				{
					name: "channel",
					description: "Where the panel is posted.",
					type: "channel",
					required: true,
				},
				{ name: "content", description: "The panel message.", type: "string", maxLength: 1_000 },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const role = roleOption(interaction, "role");
				const channel = textChannelOption(interaction, "channel");

				if (!role) throw new UserFacingError("Pick a role to grant on verification.");
				if (!channel?.isTextBased() || !channel.isSendable()) throw new UserFacingError("Pick a text channel.");

				const me = guild.members.me;
				if (me && role.position >= me.roles.highest.position) {
					throw new UserFacingError("That role is higher than mine, so I could not assign it.");
				}

				const message = interaction.options.getString("content") ?? "Press the button below to verify yourself.";

				const posted = await channel.send({
					embeds: [
						embed({
							category: "settings",
							title: `${theme.emoji.verify} Verification`,
							description: message,
							...(guild.iconURL() !== null ? { thumbnail: guild.iconURL()! } : {}),
						}),
					],
					components: [
						row(
							button({
								id: customId("verify", "start"),
								label: "Verify",
								emoji: theme.emoji.verify,
								style: ButtonStyle.Success,
							}),
						),
					],
				});

				await saveVerifyConfig(guild.id, { channelId: channel.id, roleId: role.id, messageId: posted.id });
				await reply(interaction, {
					embeds: [successEmbed(`Verification is set up in ${channel}.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "disable",
			description: "Turn verification off.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await deleteVerifyConfig(guild.id);
				if (!removed) throw new UserFacingError("Verification is not set up here.");

				await reply(interaction, { embeds: [successEmbed("Verification has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the verification configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const config = await getVerifyConfig(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Verification",
							description: config
								? `Enabled in <#${config.channelId}>, granting <@&${config.roleId}>.\n**${config.verifiedIds.length}** member(s) verified.`
								: "Not configured.",
						}),
					],
				});
			},
		},
	],
});
