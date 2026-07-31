import { LEVEL_LIMITS } from "@testify/shared";
import { TABS, type Tab } from "@/features/levelling/levelling.types";

/** A tab name out of a URL can be anything at all. */
export function tabFrom(raw: string | null): Tab {
	return TABS.some((tab) => tab.key === raw) ? (raw as Tab) : "general";
}

/** A role deleted in Discord after being configured here still has to render as something. */
export function roleNameOf(roles: { id: string; name: string }[], roleId: string): string {
	return roles.find((role) => role.id === roleId)?.name ?? "A deleted role";
}

export function multiplierChoices(): number[] {
	const { minMultiplier, maxMultiplier } = LEVEL_LIMITS;
	return Array.from({ length: maxMultiplier - minMultiplier + 1 }, (_unused, index) => minMultiplier + index);
}
