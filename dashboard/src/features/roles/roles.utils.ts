import { type RoleSummary, type RoleUse, type RoleUseKind } from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";
import { formatNumber } from "@/lib/intl";

export const USE_SCREENS: Record<RoleUseKind, { path: string; labelKey: TranslationKey }> = {
	levelReward: { path: "/levelling", labelKey: "nav.levelling" },
	levelBoost: { path: "/levelling", labelKey: "nav.levelling" },
	levelIgnored: { path: "/levelling", labelKey: "nav.levelling" },
	joinRole: { path: "/settings", labelKey: "nav.settings" },
	roleMenu: { path: "/role-menus", labelKey: "nav.roleMenus" },
	dj: { path: "/music", labelKey: "nav.music" },
	ticketStaff: { path: "/tickets", labelKey: "nav.tickets" },
	raidPing: { path: "/raid-protection", labelKey: "nav.raid" },
	verified: { path: "/settings", labelKey: "nav.settings" },
};

export function useText(use: RoleUse, t: TFunction): string {
	switch (use.kind) {
		case "levelReward":
			return t("roles.levelReward", { level: use.level });
		case "levelBoost":
			return t("roles.levelBoost", { multiplier: formatNumber(use.multiplier) });
		case "levelIgnored":
			return t("roles.levelIgnored");
		case "joinRole":
			return t("roles.joinRole");
		case "roleMenu":
			return t("roles.roleMenu", { title: use.title });
		case "dj":
			return t("roles.dj");
		case "ticketStaff":
			return t("roles.ticketStaff");
		case "raidPing":
			return t("roles.raidPing");
		case "verified":
			return t("roles.verified");
	}
}

export function deletedRoleIds(uses: Record<string, RoleUse[]>, roles: readonly RoleSummary[]): string[] {
	const known = new Set(roles.map((role) => role.id));
	return Object.keys(uses).filter((id) => !known.has(id) && (uses[id]?.length ?? 0) > 0);
}

export function rolesSummary(uses: Record<string, RoleUse[]>, roles: readonly RoleSummary[], t: TFunction): string {
	const used = roles.filter((role) => (uses[role.id]?.length ?? 0) > 0).length;
	return used === 0 ? t("roles.summaryNone") : t("roles.summary", { count: used });
}

export function roleSummary(uses: readonly RoleUse[], t: TFunction): string {
	return uses.length === 0 ? t("roles.roleSummaryNone") : t("roles.roleSummary", { count: uses.length });
}
