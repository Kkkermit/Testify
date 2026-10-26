import { PermissionFlagsBits } from "discord.js";
import { channelOption, defineCommand, inGuild, inTextChannel } from "@core/command";
import { embed, reply } from "@lib/discord";
import { DEFAULT_REASON, setLocked } from "@lib/moderation";

export default defineCommand({
	name: "lock",
	description: "Stops everyone from sending messages in a channel.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageChannels],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	options: [
		{
			name: "channel",
			description: "The channel to lock. Defaults to this one.",
			type: "channel",
		},
		{ name: "reason", description: "Why the channel is being locked.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const channel = channelOption(interaction, "channel") ?? inTextChannel(interaction);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		await setLocked(channel, guild, true, `${interaction.user.username}: ${reason}`);

		await reply(interaction, {
			embeds: [
				embed({
					category: "moderation",
					title: "🔒 Channel locked",
					description: `${channel} has been locked.`,
					fields: [{ name: "Reason", value: reason }],
				}),
			],
		});
	},
});
