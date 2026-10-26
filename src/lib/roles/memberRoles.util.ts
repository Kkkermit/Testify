import { type Guild, type GuildMember, type Role } from "discord.js";
import { UserFacingError } from "@core/errors";
import { grantProblem } from "@lib/roles/roleReach.util";
import { type MemberRoles } from "@testify/shared";

/** A member's roles as the person reading may change them: only what they could hand out themselves in Discord. */

/** Highest first; no reader means a bot owner, who is held only to what the bot can give. */
export function grantableRoles(guild: Guild, reader: GuildMember | undefined): Role[] {
	return [...guild.roles.cache.values()]
		.filter((role) => grantProblem(reader, role.id, guild) === null)
		.sort((a, b) => b.position - a.position);
}

export function memberRoles(guild: Guild, member: GuildMember, reader: GuildMember | undefined): MemberRoles {
	return {
		roles: grantableRoles(guild, reader).map((role) => ({
			id: role.id,
			name: role.name,
			colour: role.hexColor === "#000000" ? null : role.hexColor,
			held: member.roles.cache.has(role.id),
		})),
	};
}

/** `wanted` is the whole set among the reader's roles; anything held beyond their reach is never touched. */
export async function setMemberRoles(
	guild: Guild,
	member: GuildMember,
	wanted: readonly string[],
	reader: GuildMember | undefined,
	by: string,
): Promise<{ added: string[]; removed: string[]; member: GuildMember }> {
	for (const roleId of wanted) {
		const problem = grantProblem(reader, roleId, guild);
		if (problem !== null) throw new UserFacingError(problem);
	}

	const choosing = new Set(wanted);
	const reachable = grantableRoles(guild, reader).map((role) => role.id);
	const added = [...choosing].filter((roleId) => !member.roles.cache.has(roleId));
	const removed = reachable.filter((roleId) => member.roles.cache.has(roleId) && !choosing.has(roleId));

	// Each call answers with the member as Discord now holds them; the one passed in is not updated.
	let updated = member;
	if (added.length > 0) updated = await updated.roles.add(added, `Added by ${by}`);
	if (removed.length > 0) updated = await updated.roles.remove(removed, `Removed by ${by}`);

	return { added, removed, member: updated };
}
