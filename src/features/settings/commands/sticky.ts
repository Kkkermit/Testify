import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { listSticky, removeSticky, setSticky } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

export default defineCommand({
	name: "sticky-message",
	description: "Keeps a message pinned to the bottom of a channel.",
	category: Category.Settings,
	surfaces: ["slash"],
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
					channelTypes: [ChannelType.GuildText],
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
					minValue: 1,
					maxValue: 50,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				const message = ctx.options.getString("message", true);
				await setSticky(guild.id, channel.id, message, ctx.options.getInteger("cap", true));

				await ctx.reply({ embeds: [successEmbed(`Sticky message set for ${channel}.`)] });
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
					channelTypes: [ChannelType.GuildText],
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel) throw new UserFacingError("I could not find that channel.");

				const removed = await removeSticky(guild.id, channel.id);
				if (!removed) throw new UserFacingError("There is no sticky message in that channel.");

				await ctx.reply({ embeds: [successEmbed(`Sticky message removed from ${channel}.`)] });
			},
		},
		{
			name: "check",
			description: "List the active sticky messages.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const all = await listSticky(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
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

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `setup`, `disable` or `check`.", ephemeral: true });
	},
});
