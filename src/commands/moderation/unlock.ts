import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, inTextChannel } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed } from "../../lib/embeds";
import { DEFAULT_REASON } from "../../lib/moderationActions";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "unlock",
	description: "Lets everyone send messages in a channel again.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageChannels],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	options: [
		{
			name: "channel",
			description: "The channel to unlock. Defaults to this one.",
			type: "channel",
		},
		{ name: "reason", description: "Why the channel is being unlocked.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const channel = interaction.options.getChannel("channel") ?? inTextChannel(interaction);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		if (!("permissionOverwrites" in channel)) throw new UserFacingError("That channel cannot be unlocked.");

		await channel.permissionOverwrites.edit(
			guild.roles.everyone,
			{ SendMessages: null },
			{ reason: `${interaction.user.username}: ${reason}` },
		);

		await reply(interaction, {
			embeds: [
				embed({
					category: "moderation",
					title: "🔓 Channel unlocked",
					description: `${channel} has been unlocked.`,
					fields: [{ name: "Reason", value: reason }],
				}),
			],
		});
	},
});
