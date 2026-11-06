import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineContextMenu } from "@core/contextMenu";
import { successEmbed } from "@lib/discord";
import { addToStarboard, STARBOARD_COMMAND } from "@lib/starboard";

export default defineContextMenu({
	name: "Add to starboard",
	description: "Puts a message on the starboard however many stars it has.",
	type: "message",
	switchedBy: STARBOARD_COMMAND,
	permissions: [PermissionFlagsBits.ManageMessages],

	async run(interaction) {
		const { channelId, messageId } = await addToStarboard(interaction.targetMessage);
		const link = `https://discord.com/channels/${interaction.guildId}/${channelId}/${messageId}`;

		await interaction.reply({
			embeds: [successEmbed(`It is on the board in <#${channelId}>: ${link}`)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
