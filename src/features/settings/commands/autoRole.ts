import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild, requireMember } from "../../../core/guards";
import { addAutoRole, getAutoRoles, removeAutoRole } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "auto-role",
	description: "Gives roles automatically to new members.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageRoles],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	subcommands: [
		{
			name: "add",
			description: "Add a role to the auto-role list.",
			options: [{ name: "role", description: "The role to grant on join.", type: "role", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const moderator = requireMember(ctx);
				const role = ctx.options.getRole("role");
				if (!role) throw new UserFacingError("I could not find that role.");

				if (role.managed) throw new UserFacingError("Integration-managed roles cannot be assigned automatically.");
				if (moderator.id !== guild.ownerId && role.position >= moderator.roles.highest.position) {
					throw new UserFacingError("That role is equal to or higher than your own.");
				}

				const me = guild.members.me;
				if (me && role.position >= me.roles.highest.position) {
					throw new UserFacingError("That role is higher than mine, so I could not assign it.");
				}

				const settings = await addAutoRole(guild.id, role.id);
				await ctx.reply({
					embeds: [successEmbed(`${role} will now be given to new members. (${settings.roleIds.length} total)`)],
				});
			},
		},
		{
			name: "remove",
			description: "Remove a role from the auto-role list.",
			options: [{ name: "role", description: "The role to stop granting.", type: "role", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const role = ctx.options.getRole("role");
				if (!role) throw new UserFacingError("I could not find that role.");

				const settings = await removeAutoRole(guild.id, role.id);
				if (!settings) throw new UserFacingError("Auto-role is not configured here.");

				await ctx.reply({ embeds: [successEmbed(`${role} is no longer given to new members.`)] });
			},
		},
		{
			name: "list",
			description: "Show the configured auto-roles.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getAutoRoles(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Auto-roles",
							description:
								settings && settings.roleIds.length > 0
									? settings.roleIds.map((id) => `<@&${id}>`).join("\n")
									: "No auto-roles are configured.",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `add`, `remove` or `list`.", ephemeral: true });
	},
});
