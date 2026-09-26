import { type MusicSettings, type RoleSummary } from "@testify/shared";

/** The rules behind the music screen, kept out of the page so they can be tested without rendering. */

/** A role the server has since deleted is still stored, and a picker that only lists live roles would drop it. */
export function missingRoleIds(settings: Pick<MusicSettings, "djRoleIds">, roles: RoleSummary[]): string[] {
	const known = new Set(roles.map((role) => role.id));

	return settings.djRoleIds.filter((roleId) => !known.has(roleId));
}

type Access = "everybody" | "djs" | "off";

export function accessOf(settings: MusicSettings): Access {
	if (!settings.enabled) return "off";

	return settings.djRoleIds.length === 0 ? "everybody" : "djs";
}
