import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	deleteLevelSettings,
	getLevelSettings,
	saveLevelSettings,
} from "../../../database/repositories/levelRepository";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "levelling",
	description: "Configures the levelling system.",
	category: Category.Levelling,
	surfaces: ["slash"],
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
					channelTypes: [ChannelType.GuildText],
				},
				{ name: "boost-role", description: "Members with this role earn bonus XP.", type: "role" },
				{
					name: "multiplier",
					description: "The XP multiplier for that role.",
					type: "integer",
					minValue: 1,
					maxValue: 5,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				const role = ctx.options.getRole("boost-role");

				await saveLevelSettings(guild.id, {
					isDisabled: false,
					levelUpChannelId: channel?.id ?? "current",
					roleId: role?.id ?? null,
					multiplier: ctx.options.getInteger("multiplier") ?? 1,
				});

				await ctx.reply({ embeds: [successEmbed("Levelling is enabled and configured.")] });
			},
		},
		{
			name: "toggle",
			description: "Turn levelling on or off.",
			options: [{ name: "enabled", description: "Whether members earn XP.", type: "boolean", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const enabled = ctx.options.getBoolean("enabled", true);

				await saveLevelSettings(guild.id, { isDisabled: !enabled });
				await ctx.reply({ embeds: [successEmbed(enabled ? "Levelling is on." : "Levelling is off.")] });
			},
		},
		{
			name: "disable",
			description: "Remove the levelling configuration entirely.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await deleteLevelSettings(guild.id);
				if (!removed) throw new UserFacingError("Levelling is not configured here.");

				await ctx.reply({ embeds: [successEmbed("Levelling configuration removed.")] });
			},
		},
		{
			name: "status",
			description: "Show the current levelling configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getLevelSettings(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Levelling,
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

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `setup`, `toggle`, `disable` or `status`.", ephemeral: true });
	},
});
