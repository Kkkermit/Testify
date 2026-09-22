import { PermissionFlagsBits } from "discord.js";
import { countingState } from "@buttons/counting";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { countingPanel } from "@lib/settings";

/** One panel instead of `setup`, `disable`, `reset` and `status`. */
export default defineCommand({
	name: "counting",
	description: "Runs the counting game in a channel.",
	category: "settings",
	aliases: ["count"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, countingPanel(await countingState(guild.id), interaction.user.id));
	},
});
