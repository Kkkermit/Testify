import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, textChannelOption } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { COLOUR_CHOICES, resolveColour } from "../../lib/colours";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "announce",
	description: "Posts an announcement embed in a channel.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
	options: [
		{
			name: "channel",
			description: "Where to post the announcement.",
			type: "channel",
			required: true,
		},
		{ name: "title", description: "The announcement title.", type: "string", maxLength: 256 },
		{ name: "description", description: "The announcement body.", type: "string", maxLength: 2_000 },
		{ name: "color", description: "The embed colour.", type: "string", choices: COLOUR_CHOICES },
		{ name: "ping-everyone", description: "Mention @everyone with the announcement.", type: "boolean" },
	],

	async run(interaction) {
		const channel = textChannelOption(interaction, "channel");
		if (!channel?.isTextBased() || !channel.isSendable()) {
			throw new UserFacingError("Pick a text channel I can send messages in.");
		}

		const announcement = embed({
			colour: resolveColour(interaction.options.getString("color")),
			title: interaction.options.getString("title") ?? "Announcement",
			description: interaction.options.getString("description") ?? "*No description provided.*",
			footer: `Posted by ${interaction.user.username}`,
			footerIcon: interaction.user.displayAvatarURL(),
		});

		const pingEveryone = interaction.options.getBoolean("ping-everyone") ?? false;

		await channel.send({
			embeds: [announcement],
			...(pingEveryone ? { content: "@everyone", allowedMentions: { parse: ["everyone"] as const } } : {}),
		});

		await reply(interaction, {
			embeds: [successEmbed(`Announcement posted in ${channel}.`)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
