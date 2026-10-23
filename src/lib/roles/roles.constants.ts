import { PermissionFlagsBits } from "discord.js";

/** The identifiers and limits more than one module in this domain reads. */

/** The public menu members press. */
export const ROLE_MENU_ID = "rolemenu";

/** The manager's panel behind `/role-menu`. */
export const ROLE_MENU_ADMIN_ID = "rolemenuadmin";

/** A role carrying any of these could be used against the server, so nobody may pick it for themselves. */
export const POWERFUL_PERMISSIONS = [
	PermissionFlagsBits.Administrator,
	PermissionFlagsBits.ManageGuild,
	PermissionFlagsBits.ManageRoles,
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ManageWebhooks,
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.ManageNicknames,
	PermissionFlagsBits.ManageThreads,
	PermissionFlagsBits.ManageEvents,
	PermissionFlagsBits.ManageGuildExpressions,
	PermissionFlagsBits.BanMembers,
	PermissionFlagsBits.KickMembers,
	PermissionFlagsBits.ModerateMembers,
	PermissionFlagsBits.MentionEveryone,
	PermissionFlagsBits.ViewAuditLog,
] as const;
