import { PermissionFlagsBits } from "discord.js";
import { asMember, defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { COLOUR_CHOICES, reply, resolveColour, successEmbed } from "@lib/discord";
import { announcementMessage, mentionProblem } from "@lib/moderation";

export default defineCommand({
	name: "announce",
	description: "Posts an announcement embed in a channel.",
	category: "moderation",
	private: true,
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

		const mentions = (interaction.options.getBoolean("ping-everyone") ?? false) ? "everyone" : "none";
		const problem = mentionProblem(channel, inGuild(interaction), asMember(interaction), mentions);
		if (problem !== null) throw new UserFacingError(problem);

		await channel.send(
			announcementMessage({
				style: "embed",
				title: interaction.options.getString("title") ?? undefined,
				message: interaction.options.getString("description") ?? "*No description provided.*",
				colour: resolveColour(interaction.options.getString("color")),
				mentions,
				by: { name: interaction.user.username, avatarUrl: interaction.user.displayAvatarURL() },
			}),
		);

		await reply(interaction, {
			embeds: [successEmbed(`Announcement posted in ${channel}.`)],
		});
	},
});
