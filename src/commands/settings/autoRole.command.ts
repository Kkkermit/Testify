import { PermissionFlagsBits } from "discord.js";
import { currentRoles, unusableRoles } from "@buttons/autoRole";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { autoRolePanel } from "@lib/settings";

/** One panel instead of `add`, `remove` and `list`. */
export default defineCommand({
	name: "auto-role",
	description: "Gives roles automatically to new members.",
	category: "settings",
	aliases: ["autorole", "join-roles"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageRoles],
	botPermissions: [PermissionFlagsBits.ManageRoles],

	async run(interaction) {
		const guild = inGuild(interaction);
		const roleIds = await currentRoles(guild.id);

		await reply(interaction, autoRolePanel({ roleIds, unusable: unusableRoles(guild, roleIds) }, interaction.user.id));
	},
});
