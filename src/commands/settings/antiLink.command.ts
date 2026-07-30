import { PermissionFlagsBits } from "discord.js";
import { antiLinkState } from "@buttons/antiLink";
import { defineCommand, inGuild } from "@core/command";
import { antiLinkPanel } from "@lib/antiLinkPanel.util";
import { reply } from "@lib/reply.util";

/**
 * One panel instead of `enable`, `disable` and `status`.
 *
 * `enable` required the bypass permission as an option every time, so changing
 * your mind about the filter meant re-typing the part you were happy with.
 */
export default defineCommand({
	name: "anti-link",
	description: "Deletes links posted by members without the bypass permission.",
	category: "settings",
	aliases: ["antilink", "link-filter"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageMessages],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, antiLinkPanel(await antiLinkState(guild.id), interaction.user.id));
	},
});
