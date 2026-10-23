import { DiscordAPIError, type Guild, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { UserFacingError } from "@core/errors";
import {
	listRoleMenus,
	type RoleMenuFields,
	setRoleMenuMessage,
	type StoredRoleMenu,
	updateRoleMenu,
} from "@database/repositories/roleMenuRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { type OfferedRole, roleMenuPost } from "@lib/roles/roleMenuPanel.util";
import { pickProblem } from "@lib/roles/roleReach.util";
import { ROLE_MENU_LIMITS, type RoleMenuList } from "@testify/shared";

/** Posting, moving and taking down a menu, and handing a member the roles they picked. */

const MENU_GONE = "That role menu has been deleted.";

export async function readRoleMenus(guild: Guild): Promise<RoleMenuList> {
	const menus = await listRoleMenus(guild.id);

	return {
		menus: menus.map((menu) => ({
			id: menu.id,
			channelId: menu.channelId,
			title: menu.title,
			description: menu.description,
			roleIds: menu.roleIds,
			mode: menu.mode,
			posted: menu.messageId !== null,
			canSend: canPostIn(guild, menu.channelId),
		})),
		limit: ROLE_MENU_LIMITS.maxPerGuild,
	};
}

/** Posts the menu, or edits the post already there, and answers with the message it left behind. */
export async function publishRoleMenu(guild: Guild, menu: StoredRoleMenu): Promise<string> {
	if (menu.roleIds.length === 0) throw new UserFacingError("Pick at least one role to offer before posting.");

	const channel = await guild.channels.fetch(menu.channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("I cannot post in that channel. Pick another one, or let me send messages there.");
	}

	// The role list is mentions, which must render as names without pinging every holder.
	const payload = { ...roleMenuPost(menu), allowedMentions: { parse: [] } };

	if (menu.messageId !== null) {
		const existing = await channel.messages.fetch(menu.messageId).catch(() => null);
		if (existing !== null) {
			await existing.edit(payload);
			return existing.id;
		}
	}

	const sent = await channel.send(payload);
	await setRoleMenuMessage(guild.id, menu.id, sent.id);

	return sent.id;
}

/** Nobody loses a role when a post comes down; it only stops more being picked from it. */
export async function takeDownRoleMenu(guild: Guild, menu: StoredRoleMenu): Promise<void> {
	if (menu.messageId === null) return;

	const channel = await guild.channels.fetch(menu.channelId).catch(() => null);
	if (channel?.isTextBased() === true) {
		await channel.messages.delete(menu.messageId).catch(() => undefined);
	}
	await setRoleMenuMessage(guild.id, menu.id, null);
}

/** Saves a change and carries it to the post; a post that could not follow is a note, because the change did happen. */
export async function changeRoleMenu(
	guild: Guild,
	menu: StoredRoleMenu,
	fields: Partial<RoleMenuFields>,
	updatedBy: string | null,
): Promise<{ menu: StoredRoleMenu; note: string | null }> {
	const wasPosted = menu.messageId !== null;
	if (wasPosted && fields.channelId !== undefined && fields.channelId !== menu.channelId) {
		await takeDownRoleMenu(guild, menu);
	}

	const updated = await updateRoleMenu(guild.id, menu.id, fields, updatedBy);
	if (updated === null) throw new UserFacingError(MENU_GONE);
	if (!wasPosted || updated.roleIds.length === 0) return { menu: updated, note: null };

	try {
		const messageId = await publishRoleMenu(guild, updated);
		return { menu: { ...updated, messageId }, note: null };
	} catch (error) {
		if (error instanceof UserFacingError) {
			return { menu: updated, note: `Saved, but the post was not updated. ${error.message}` };
		}
		throw error;
	}
}

/** Each role on the menu as this member sees it, in the menu's own order. */
export function offeredRoles(guild: Guild, menu: StoredRoleMenu, member: GuildMember): OfferedRole[] {
	return menu.roleIds.map((roleId) => {
		const role = guild.roles.cache.get(roleId);

		return {
			id: roleId,
			name: role?.name ?? "Deleted role",
			held: member.roles.cache.has(roleId),
			available: pickProblem(role, guild) === null,
		};
	});
}

export interface PickOutcome {
	added: string[];
	removed: string[];
	refused: string[];
}

/** Gives and takes away the difference; a role that is not on offer right now is left exactly as it is. */
export async function applyRolePicks(
	guild: Guild,
	menu: StoredRoleMenu,
	member: GuildMember,
	picked: readonly string[],
): Promise<PickOutcome> {
	const offered = offeredRoles(guild, menu, member);
	const available = new Set(offered.filter((role) => role.available).map((role) => role.id));

	let wanted = picked.filter((roleId) => menu.roleIds.includes(roleId));
	if (menu.mode === "one") wanted = wanted.slice(0, 1);

	const outcome: PickOutcome = {
		added: [],
		removed: [],
		refused: wanted.filter((roleId) => !available.has(roleId)),
	};

	for (const role of offered) {
		if (!available.has(role.id)) continue;
		const want = wanted.includes(role.id);
		if (want && !role.held) outcome.added.push(role.id);
		if (!want && role.held) outcome.removed.push(role.id);
	}

	const reason = `Role menu: ${menu.title}`;
	try {
		if (outcome.added.length > 0) await member.roles.add(outcome.added, reason);
		if (outcome.removed.length > 0) await member.roles.remove(outcome.removed, reason);
	} catch (error) {
		if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.MissingPermissions) {
			throw new UserFacingError(
				"I need the Manage Roles permission to change your roles. Ask a manager to check mine.",
			);
		}
		throw error;
	}

	return outcome;
}

/** Splits a pick of the role select into the roles that may go on the menu and a line for each that may not. */
export function splitOffer(
	roleIds: readonly string[],
	problemOf: (roleId: string) => string | null,
): { kept: string[]; refused: string[] } {
	const kept: string[] = [];
	const refused: string[] = [];

	for (const roleId of roleIds) {
		const problem = problemOf(roleId);
		if (problem === null) kept.push(roleId);
		else refused.push(problem);
	}

	return { kept: kept.slice(0, ROLE_MENU_LIMITS.maxRoles), refused };
}
