import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { listRoleMenus } from "@database/repositories/roleMenuRepository";
import { reply } from "@lib/discord";
import { roleMenuHub } from "@lib/roles";

/** Menus members pick their own roles from, made and posted from one panel. */
export default defineCommand({
	name: "role-menu",
	description: "Posts menus members pick their own roles from.",
	category: "settings",
	private: true,
	aliases: ["rolemenu", "self-roles", "selfroles"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageRoles],
	botPermissions: [PermissionFlagsBits.ManageRoles],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, roleMenuHub(await listRoleMenus(guild.id), interaction.user.id));
	},
});
