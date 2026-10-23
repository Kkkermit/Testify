import {
	type RoleMenuBody,
	roleMenuBlocked,
	type RoleMenuEntry,
	type RoleMenuMode,
	type RoleSummary,
} from "@testify/shared";

export interface RoleMenuDraft {
	channelId: string | null;
	title: string;
	description: string;
	roleIds: string[];
	mode: RoleMenuMode;
}

export function emptyDraft(): RoleMenuDraft {
	return { channelId: null, title: "", description: "", roleIds: [], mode: "many" };
}

/** Roles nobody may pick for themselves, which the checklist shows greyed rather than hides. */
export function offerBlocked(role: RoleSummary): boolean {
	return !role.assignableByBot || role.powerful;
}

/** A role that has gone, or can no longer be offered, leaves the draft: it could not be unticked, and saving it is refused. */
export function draftOf(entry: RoleMenuEntry, roles: readonly RoleSummary[]): RoleMenuDraft {
	const offerable = new Set(roles.filter((role) => !offerBlocked(role)).map((role) => role.id));

	return {
		channelId: entry.channelId,
		title: entry.title,
		description: entry.description,
		roleIds: entry.roleIds.filter((roleId) => offerable.has(roleId)),
		mode: entry.mode,
	};
}

/** The body to send, or null while `roleMenuBlocked` has something to say; `clean` sanitises the free text. */
export function bodyOf(draft: RoleMenuDraft, clean: (value: string) => string): RoleMenuBody | null {
	if (roleMenuBlocked(draft) !== null || draft.channelId === null) return null;

	return {
		channelId: draft.channelId,
		title: clean(draft.title),
		description: clean(draft.description),
		roleIds: draft.roleIds,
		mode: draft.mode,
	};
}
