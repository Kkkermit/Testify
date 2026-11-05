import { type MusicSettings, type RoleSummary } from "@testify/shared";

/** A role deleted since is still stored, and a picker of live roles alone would drop it. */
export function missingRoleIds(settings: Pick<MusicSettings, "djRoleIds">, roles: RoleSummary[]): string[] {
	const known = new Set(roles.map((role) => role.id));

	return settings.djRoleIds.filter((roleId) => !known.has(roleId));
}

type Access = "everybody" | "djs" | "off";

export function accessOf(settings: MusicSettings): Access {
	if (!settings.enabled) return "off";

	return settings.djRoleIds.length === 0 ? "everybody" : "djs";
}
