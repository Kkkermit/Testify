import { PermissionFlagsBits } from "discord.js";
import { COUNTING_DEFAULT_MAX } from "../../config/constants";
import { defineCommand, inGuild, textChannelOption } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { disableCounting, getCounting, resetCount, setCounting } from "../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "counting",
	description: "Runs the counting game in a channel.",
	category: "settings",
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
				},
				{
					name: "goal",
					description: "The number to count up to.",
					type: "integer",
					min: 10,
					max: COUNTING_DEFAULT_MAX,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel?.isTextBased()) throw new UserFacingError("Pick a text channel.");

				const goal = interaction.options.getInteger("goal") ?? COUNTING_DEFAULT_MAX;
				await setCounting(guild.id, channel.id, goal);

				await reply(interaction, {
					embeds: [
						successEmbed(`Counting is set up in ${channel}. Start at **1** and count to **${formatNumber(goal)}**.`),
					],
				});
			},
		},
		{
			name: "disable",
			description: "Turn the counting game off.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await disableCounting(guild.id);
				if (!removed) throw new UserFacingError("Counting is not set up here.");
				await reply(interaction, { embeds: [successEmbed("Counting has been turned off.")] });
			},
		},
		{
			name: "reset",
			description: "Reset the count back to zero.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getCounting(guild.id);
				if (!settings) throw new UserFacingError("Counting is not set up here.");

				await resetCount(guild.id);
				await reply(interaction, { embeds: [successEmbed("The count has been reset. The next number is **1**.")] });
			},
		},
		{
			name: "status",
			description: "Show the current count.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getCounting(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
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
});
