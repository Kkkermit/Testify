import {
	type RoleMenuBody,
	roleMenuBlocked,
	type RoleMenuEntry,
	type RoleMenuMode,
	type RoleSummary,
} from "@testify/shared";
import { type TFunction } from "i18next";

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

export function draftChanged(from: RoleMenuDraft, to: RoleMenuDraft): boolean {
	const roles = (draft: RoleMenuDraft): string => [...draft.roleIds].sort().join(",");

	return (
		from.channelId !== to.channelId ||
		from.title !== to.title ||
		from.description !== to.description ||
		from.mode !== to.mode ||
		roles(from) !== roles(to)
	);
}

export function offerBlocked(role: RoleSummary): boolean {
	return !role.assignableByBot || role.powerful;
}

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

export function roleMenuSummary(menus: readonly Pick<RoleMenuEntry, "posted">[], t: TFunction): string {
	if (menus.length === 0) return t("roleMenus.summaryNone");
	const posted = menus.filter((menu) => menu.posted).length;
	return posted === 0 ? t("roleMenus.summaryNonePosted") : t("roleMenus.summaryPosted", { count: posted });
}
