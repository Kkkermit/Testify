import { ChannelType, PermissionFlagsBits } from "discord.js";
import { COUNTING_DEFAULT_MAX } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	disableCounting,
	getCounting,
	resetCount,
	setCounting,
} from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "counting",
	description: "Runs the counting game in a channel.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "setup",
			description: "Choose the counting channel.",
			options: [
				{
					name: "channel",
					description: "Where counting happens.",
					type: "channel",
					required: true,
					channelTypes: [ChannelType.GuildText],
				},
				{
					name: "goal",
					description: "The number to count up to.",
					type: "integer",
					minValue: 10,
					maxValue: COUNTING_DEFAULT_MAX,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased()) throw new UserFacingError("Pick a text channel.");

				const goal = ctx.options.getInteger("goal") ?? COUNTING_DEFAULT_MAX;
				await setCounting(guild.id, channel.id, goal);

				await ctx.reply({
					embeds: [
						successEmbed(`Counting is set up in ${channel}. Start at **1** and count to **${formatNumber(goal)}**.`),
					],
				});
			},
		},
		{
			name: "disable",
			description: "Turn the counting game off.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await disableCounting(guild.id);
				if (!removed) throw new UserFacingError("Counting is not set up here.");
				await ctx.reply({ embeds: [successEmbed("Counting has been turned off.")] });
			},
		},
		{
			name: "reset",
			description: "Reset the count back to zero.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getCounting(guild.id);
				if (!settings) throw new UserFacingError("Counting is not set up here.");

				await resetCount(guild.id);
				await ctx.reply({ embeds: [successEmbed("The count has been reset. The next number is **1**.")] });
			},
		},
		{
			name: "status",
			description: "Show the current count.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getCounting(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Counting",
							description: settings
								? `Channel: <#${settings.channelId}>\nCurrent count: **${formatNumber(settings.count)}**\nGoal: **${formatNumber(settings.maxCount)}**`
								: "Counting is not set up here.",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `setup`, `disable`, `reset` or `status`.", ephemeral: true });
	},
});
