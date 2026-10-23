import { type Guild, type GuildMember, type Role } from "discord.js";
import { POWERFUL_PERMISSIONS } from "@lib/roles/roles.constants";

/** Who may have the bot hand out which role: the rule the dashboard, `/role-menu` and a member's own pick all share. */

/** Why the bot itself cannot give this role, whoever asks, or null when it can. */
export function botGrantProblem(role: Role | undefined, guild: Guild): string | null {
	if (role === undefined) return "That role is not in this server.";
	if (role.id === guild.id || role.managed) {
		return `${role.name} is managed by Discord or an integration, so nobody can hand it out.`;
	}

	const ceiling = guild.members.me?.roles.highest.position ?? 0;
	if (role.position >= ceiling)
		return `${role.name} sits at or above the bot's own highest role, so it cannot give it.`;

	return null;
}

/** Why the bot may not hand out this role on `member`'s behalf, or null when it may; no member means a bot owner. */
export function grantProblem(member: GuildMember | undefined, roleId: string, guild: Guild): string | null {
	const role = guild.roles.cache.get(roleId);
	const problem = botGrantProblem(role, guild);
	if (problem !== null || role === undefined) return problem;

	// Discord's own rule for Manage Roles: only below your highest role, unless you own the server.
	if (member !== undefined && member.id !== guild.ownerId && role.position >= member.roles.highest.position) {
		return `${role.name} sits at or above your own highest role, so you cannot have the bot hand it out.`;
	}

	return null;
}

export function isPowerful(role: Role): boolean {
	return role.permissions.any([...POWERFUL_PERMISSIONS]);
}

/** Why a role cannot go on a menu members pick from: the grant rule, and nothing that moderates or administers. */
export function offerProblem(member: GuildMember | undefined, roleId: string, guild: Guild): string | null {
	const problem = grantProblem(member, roleId, guild);
	if (problem !== null) return problem;

	const role = guild.roles.cache.get(roleId);
	if (role !== undefined && isPowerful(role)) {
		return `${role.name} carries moderation or admin permissions, so members cannot pick it for themselves.`;
	}

	return null;
}

/** Checked again on every pick, because a role's permissions or position can change after the menu was made. */
export function pickProblem(role: Role | undefined, guild: Guild): string | null {
	const problem = botGrantProblem(role, guild);
	if (problem !== null || role === undefined) return problem;

	return isPowerful(role) ? `${role.name} now carries moderation or admin permissions.` : null;
}
