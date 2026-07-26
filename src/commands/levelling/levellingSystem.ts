import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, roleOption } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { deleteLevelSettings, getLevelSettings, saveLevelSettings } from "../../database/repositories/levelRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "levelling",
	description: "Configures the levelling system.",
	category: "levelling",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "setup",
			description: "Turn levelling on and configure it.",
			options: [
				{
					name: "channel",
					description: "Where level-up messages go. Leave empty to use the current channel.",
					type: "channel",
				},
				{ name: "boost-role", description: "Members with this role earn bonus XP.", type: "role" },
				{
					name: "multiplier",
					description: "The XP multiplier for that role.",
					type: "integer",
					min: 1,
					max: 5,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = interaction.options.getChannel("channel");
				const role = roleOption(interaction, "boost-role");

				await saveLevelSettings(guild.id, {
					isDisabled: false,
					levelUpChannelId: channel?.id ?? "current",
					roleId: role?.id ?? null,
					multiplier: interaction.options.getInteger("multiplier") ?? 1,
				});

				await reply(interaction, { embeds: [successEmbed("Levelling is enabled and configured.")] });
			},
		},
		{
			name: "toggle",
			description: "Turn levelling on or off.",
			options: [{ name: "enabled", description: "Whether members earn XP.", type: "boolean", required: true }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const enabled = interaction.options.getBoolean("enabled", true);

				await saveLevelSettings(guild.id, { isDisabled: !enabled });
				await reply(interaction, { embeds: [successEmbed(enabled ? "Levelling is on." : "Levelling is off.")] });
			},
		},
		{
			name: "disable",
			description: "Remove the levelling configuration entirely.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await deleteLevelSettings(guild.id);
				if (!removed) throw new UserFacingError("Levelling is not configured here.");

				await reply(interaction, { embeds: [successEmbed("Levelling configuration removed.")] });
			},
		},
		{
			name: "status",
			description: "Show the current levelling configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getLevelSettings(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "levelling",
							title: "Levelling",
							description: settings
								? settings.isDisabled
									? "Configured but disabled."
									: "Enabled."
								: "Not configured.",
							...(settings
								? {
										fields: [
											{
												name: "Level-up channel",
												value:
													settings.levelUpChannelId === null || settings.levelUpChannelId === "current"
														? "Wherever the message was sent"
														: `<#${settings.levelUpChannelId}>`,
												inline: true,
											},
											{
												name: "Boost role",
												value: settings.roleId !== null ? `<@&${settings.roleId}>` : "None",
												inline: true,
											},
											{ name: "Multiplier", value: `\u00d7${settings.multiplier}`, inline: true },
										],
									}
								: {}),
						}),
					],
				});
			},
		},
	],
});
