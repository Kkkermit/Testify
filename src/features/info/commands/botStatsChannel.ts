import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getFixedStats, removeFixedStats, setFixedStats } from "../../../database/repositories/settingsRepository";
import { successEmbed } from "../../../ui/embeds";
import { botStatsEmbed } from "../services/statsEmbed";

export default defineCommand({
	name: "bot-stats-channel",
	description: "Posts a self-updating bot statistics message in a channel.",
	category: Category.Info,
	surfaces: ["slash"],
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
					channelTypes: [ChannelType.GuildText],
				},
			],
			async execute(ctx) {
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				const guild = requireGuild(ctx);
				const existing = await getFixedStats(guild.id);
				if (existing) {
					const previous = await ctx.client.channels.fetch(existing.channelId).catch(() => null);
					if (previous?.isTextBased()) {
						await previous.messages.delete(existing.messageId).catch(() => null);
					}
				}

				const message = await channel.send({ embeds: [botStatsEmbed(ctx.client)] });
				await setFixedStats(guild.id, channel.id, message.id, ctx.user.id);

				await ctx.reply({
					embeds: [successEmbed(`Bot statistics will now be posted in ${channel}.`)],
					ephemeral: true,
				});
			},
		},
		{
			name: "remove",
			description: "Stop posting the statistics message.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const existing = await getFixedStats(guild.id);
				if (!existing) throw new UserFacingError("There is no statistics message configured here.");

				const channel = await ctx.client.channels.fetch(existing.channelId).catch(() => null);
				if (channel?.isTextBased()) await channel.messages.delete(existing.messageId).catch(() => null);

				await removeFixedStats(guild.id);
				await ctx.reply({ embeds: [successEmbed("The statistics message has been removed.")], ephemeral: true });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `set` or `remove`.", ephemeral: true });
	},
});
