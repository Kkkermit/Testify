import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed, successEmbed } from "../../../ui/embeds";
import { COLOR_CHOICES, resolveColor } from "../data/colors";

export default defineCommand({
	name: "announce",
	description: "Posts an announcement embed in a channel.",
	category: Category.Moderation,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
	options: [
		{
			name: "channel",
			description: "Where to post the announcement.",
			type: "channel",
			required: true,
			channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
		},
		{ name: "title", description: "The announcement title.", type: "string", maxLength: 256 },
		{ name: "description", description: "The announcement body.", type: "string", maxLength: 2_000 },
		{ name: "color", description: "The embed colour.", type: "string", choices: COLOR_CHOICES },
		{ name: "ping-everyone", description: "Mention @everyone with the announcement.", type: "boolean" },
	],

	async execute(ctx) {
		const channel = ctx.options.getChannel("channel");
		if (!channel?.isTextBased() || !channel.isSendable()) {
			throw new UserFacingError("Pick a text channel I can send messages in.");
		}

		const announcement = embed({
			color: resolveColor(ctx.options.getString("color")),
			title: ctx.options.getString("title") ?? "Announcement",
			description: ctx.options.getString("description") ?? "*No description provided.*",
			footer: `Posted by ${ctx.user.username}`,
			footerIcon: ctx.user.displayAvatarURL(),
		});

		const pingEveryone = ctx.options.getBoolean("ping-everyone") ?? false;

		await channel.send({
			embeds: [announcement],
			...(pingEveryone ? { content: "@everyone", allowedMentions: { parse: ["everyone"] as const } } : {}),
		});

		await ctx.reply({ embeds: [successEmbed(`Announcement posted in ${channel}.`)], ephemeral: true });
	},
});
