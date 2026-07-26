import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getVoiceCounter, setVoiceCounter } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { syncVoiceCounters } from "../services/voiceCounters";

export default defineCommand({
	name: "voice-stats",
	description: "Shows live member and bot counts in voice channel names.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageChannels],
	subcommands: [
		{
			name: "setup",
			description: "Choose the counter channels.",
			options: [
				{
					name: "member-channel",
					description: "The channel showing the member count.",
					type: "channel",
					channelTypes: [ChannelType.GuildVoice],
				},
				{
					name: "bot-channel",
					description: "The channel showing the bot count.",
					type: "channel",
					channelTypes: [ChannelType.GuildVoice],
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const memberChannel = ctx.options.getChannel("member-channel");
				const botChannel = ctx.options.getChannel("bot-channel");

				if (!memberChannel && !botChannel) throw new UserFacingError("Pick at least one channel.");

				await setVoiceCounter(guild.id, {
					memberChannelId: memberChannel?.id ?? null,
					botChannelId: botChannel?.id ?? null,
				});

				await syncVoiceCounters(ctx.client, guild);
				await ctx.reply({ embeds: [successEmbed("Voice counters configured and updated.")] });
			},
		},
		{
			name: "refresh",
			description: "Update the counters now.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				await syncVoiceCounters(ctx.client, guild);
				await ctx.reply({ embeds: [successEmbed("Counters refreshed.")], ephemeral: true });
			},
		},
		{
			name: "status",
			description: "Show the current counter configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getVoiceCounter(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Voice counters",
							fields: [
								{
									name: "Member channel",
									value:
										settings?.memberChannelId !== null && settings !== null
											? `<#${settings.memberChannelId}>`
											: "Not set",
									inline: true,
								},
								{
									name: "Bot channel",
									value:
										settings?.botChannelId !== null && settings !== null ? `<#${settings.botChannelId}>` : "Not set",
									inline: true,
								},
							],
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `setup`, `refresh` or `status`.", ephemeral: true });
	},
});
