import { PermissionFlagsBits } from "discord.js";
import { prefixState } from "@buttons/prefixSetup";
import { defineCommand, inGuild } from "@core/command";
import { prefixPanel } from "@lib/prefixPanel.util";
import { reply } from "@lib/reply.util";

/** One panel instead of `show`, `set`, `enable` and `disable`. */
export default defineCommand({
	name: "prefix",
	description: "Shows and changes the prefix for text commands.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, prefixPanel(await prefixState(guild.id), interaction.user.id));
	},
});
