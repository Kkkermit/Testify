import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { readTempVoiceSettings, TEMP_VOICE_COMMAND, tempVoiceSettingsPanel } from "@lib/tempVoice";

/** Joining a lobby voice channel makes the joiner a channel of their own; this opens its settings. */
export default defineCommand({
	name: TEMP_VOICE_COMMAND,
	description: "Sets up join-to-create voice channels, deleted once they empty.",
	category: "community",
	guildOnly: true,
	private: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, tempVoiceSettingsPanel(await readTempVoiceSettings(guild), interaction.user.id));
	},
});
