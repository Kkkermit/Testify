import { PermissionFlagsBits } from "discord.js";
import { currentRoles, unusableRoles } from "@buttons/autoRole";
import { defineCommand, inGuild } from "@core/command";
import { autoRolePanel } from "@lib/autoRolePanel.util";
import { reply } from "@lib/reply.util";

/**
 * One panel instead of `add`, `remove` and `list`.
 *
 * The three subcommands meant three round trips to change two roles, and `list`
 * existed only because `add` never showed you the result.
 */
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
