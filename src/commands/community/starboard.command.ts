import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { readStarboardSettings, STARBOARD_COMMAND, starboardSettingsPanel } from "@lib/starboard";

/** Messages that collect enough ⭐ are reposted to a highlights channel; this opens its settings. */
export default defineCommand({
	name: STARBOARD_COMMAND,
	description: "Sets up the starboard, where messages with enough ⭐ are reposted.",
	category: "community",
	guildOnly: true,
	private: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, starboardSettingsPanel(await readStarboardSettings(guild), interaction.user.id));
	},
});
