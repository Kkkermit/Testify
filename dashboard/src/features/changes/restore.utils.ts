import { type ChannelSummary, type ChangeRestore, type RoleSummary } from "@testify/shared";
import { type TFunction } from "i18next";
import { RESTORE_FIELD_LABELS } from "@/features/changes/restore.labels";
import { permissionLabel } from "@/features/commands/permissions.labels";
import { FREQUENCY_LABELS } from "@/features/lottery/lottery.labels";
import { STYLE_LABELS } from "@/features/welcome/welcome.utils";
import { type TranslationKey } from "@/i18n";
import { channelLabel } from "@/lib/channels";
import { formatNumber, formatUnit } from "@/lib/intl";

interface Lookups {
	channels: readonly ChannelSummary[];
	roles: readonly RoleSummary[];
	t: TFunction;
}

const CHANNEL = /(?:^c|C)hannelId$|^categoryId$/;
const ROLE = /(?:^r|R)oleIds?$/;

export function describeValue(field: string, value: unknown, { channels, roles, t }: Lookups): string {
	if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return t("restore.notSet");
	if (typeof value === "boolean") return t(value ? "common.on" : "common.off");

	if (ROLE.test(field)) {
		const ids = Array.isArray(value) ? value : [value];
		return ids
			.map((id) => roles.find((role) => role.id === id)?.name ?? t("roleMenus.deletedRole"))
			.join(t("common.listSeparator"));
	}
	if (typeof value === "string") {
		if (CHANNEL.test(field)) return channelLabel(channels, value, t);
		if (field === "style" && value in STYLE_LABELS) return t(STYLE_LABELS[value as keyof typeof STYLE_LABELS].label);
		if (field === "frequency" && value in FREQUENCY_LABELS) {
			return t(FREQUENCY_LABELS[value as keyof typeof FREQUENCY_LABELS]);
		}
		if (field === "bypassPermission") return permissionLabel(value, t);
		return value;
	}
	if (typeof value === "number") {
		return field.endsWith("Ms") ? formatUnit(value / 60_000, "minute", { display: "long" }) : formatNumber(value);
	}

	return t("restore.notSet");
}

export interface RestoreLine {
	field: string;
	label: string;
	now: string;
	back: string;
}

export function restoreLines(restore: ChangeRestore, lookups: Lookups): RestoreLine[] {
	const labels: Record<string, TranslationKey | undefined> = RESTORE_FIELD_LABELS[restore.action];

	return Object.entries(restore.put).map(([field, back]) => ({
		field,
		label: lookups.t(labels[field] ?? "restore.setting"),
		now: describeValue(field, restore.expect[field], lookups),
		back: describeValue(field, back, lookups),
	}));
}
