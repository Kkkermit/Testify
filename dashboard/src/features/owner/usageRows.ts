import { type CommandUsageRow } from "@testify/shared";
import { type TFunction } from "i18next";
import { categoryLabel } from "@/features/commands/categories.labels";

interface UsageBar {
	id: string;
	label: string;
	sub?: string;
	count: number;
}

export function commandBar(row: CommandUsageRow, t: TFunction): UsageBar {
	const category = categoryLabel(row.category, t);

	return {
		id: row.command,
		label: `/${row.command}`,
		sub: row.failures > 0 ? t("owner.categoryFailed", { category, failed: row.failures }) : category,
		count: row.count,
	};
}

export function surfaceBars(surfaces: { slash: number; prefix: number }, t: TFunction): UsageBar[] {
	return [
		{ id: "slash", label: t("owner.slashCommands"), count: surfaces.slash },
		{ id: "prefix", label: t("owner.prefixCommands"), count: surfaces.prefix },
	];
}
