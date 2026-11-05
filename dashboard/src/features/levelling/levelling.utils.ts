import { LEVEL_LIMITS } from "@testify/shared";
import { type TFunction } from "i18next";
import { type GeneralSettings, TABS, type Tab } from "@/features/levelling/levelling.types";
import { oneOf } from "@/lib/oneOf";

export function tabFrom(raw: string | null): Tab {
	return oneOf(
		TABS.map((tab) => tab.key),
		raw,
		"general",
	);
}

export function roleNameOf(roles: { id: string; name: string }[], roleId: string): string {
	return roles.find((role) => role.id === roleId)?.name ?? "A deleted role";
}

export function multiplierChoices(): number[] {
	const { minMultiplier, maxMultiplier } = LEVEL_LIMITS;
	return Array.from({ length: maxMultiplier - minMultiplier + 1 }, (_unused, index) => minMultiplier + index);
}

export function levellingSummary(
	settings: Pick<GeneralSettings, "enabled" | "announce" | "levelUpChannelId">,
	channel: string,
	t: TFunction,
): string {
	if (!settings.enabled) return t("levelling.summaryOff");
	if (!settings.announce) return t("levelling.summaryQuiet");
	return settings.levelUpChannelId === null
		? t("levelling.summaryWhereTalking")
		: t("levelling.summaryIn", { channel });
}
