import { PermissionFlagsBits } from "discord.js";
import { voiceStatsState } from "@buttons/voiceStats";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/reply.util";
import { voiceStatsPanel } from "@lib/voiceStatsPanel.util";

/** One panel instead of `setup`, `refresh` and `status`. */
export default defineCommand({
	name: "voice-stats",
	description: "Shows live member and bot counts in voice channel names.",
	category: "settings",
	aliases: ["voicestats", "counters"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageChannels],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, voiceStatsPanel(await voiceStatsState(guild.id), interaction.user.id));
	},
});
