import { PermissionFlagsBits } from "discord.js";

export const ANTILINK_PANEL_ID = "antilink";

export const AUDIT_PANEL_ID = "audit";

export const DEFAULT_REASON = "No reason provided";

export const WARN_LADDER_ID = "warnladder";

export const MODERATION_FORM_ID = "modform";

/** The right-click Warn asks what `/warn` asks, and goes off with it. */
export const WARN_MENU = { switchedBy: "warn", permissions: [PermissionFlagsBits.ModerateMembers] };

/** The right-click Time out asks what `/mute` asks, and goes off with it. */
export const TIMEOUT_MENU = {
	switchedBy: "mute",
	permissions: [PermissionFlagsBits.ModerateMembers],
	botPermissions: [PermissionFlagsBits.ModerateMembers],
};
