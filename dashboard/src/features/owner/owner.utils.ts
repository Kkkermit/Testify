import {
	ANALYTICS_PROBLEMS,
	ANALYTICS_WINDOWS,
	LOG_LEVELS,
	OWNER_GUILD_FILTERS,
	OWNER_GUILD_SORTS,
	snowflake,
	type AnalyticsProblem,
	type AnalyticsWindow,
	type CommandUsageRow,
	type OwnerGuildFilter,
	type OwnerGuildSort,
	type ReportedLogLevel,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { categoryLabel } from "@/features/commands/categories.labels";
import { type TranslationKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { dayAndMonth } from "@/lib/datetime";
import { formatPercent, formatUnit } from "@/lib/intl";
import { oneOf } from "@/lib/oneOf";

export const WINDOWS = ANALYTICS_WINDOWS.map((days) => ({ value: days, label: `${String(days)}d` }));

export function windowFrom(raw: string | null): AnalyticsWindow {
	const parsed = Number(raw);
	return ANALYTICS_WINDOWS.find((option) => option === parsed) ?? 30;
}

export function levelFrom(raw: string | null): ReportedLogLevel {
	return oneOf(LOG_LEVELS, raw, "trace");
}

export function percent(part: number, whole: number): string {
	return formatPercent(part, Math.max(whole, 0));
}

export function shortDay(day: string): string {
	const at = new Date(`${day}T00:00:00.000Z`);
	if (Number.isNaN(at.getTime())) return day;

	return dayAndMonth(at.toISOString());
}

export function isSnowflake(value: string): boolean {
	return snowflake.safeParse(value).success;
}

export function screenLabel(route: string): string {
	const parts = route.split("/").filter((part) => part !== "" && !part.startsWith(":"));
	const last = parts.at(-1);

	if (last === undefined) return "Home";

	return last.replace(/-/g, " ").replace(/^./, (first) => first.toUpperCase());
}

export function guildSortFrom(raw: string | null): OwnerGuildSort {
	return oneOf(OWNER_GUILD_SORTS, raw, "members");
}

export const GUILD_SORT_LABELS: Record<OwnerGuildSort, TranslationKey> = {
	members: "owner.sortMembers",
	fewest: "owner.sortFewest",
	newest: "owner.sortNewest",
	oldest: "owner.sortOldest",
	commands: "owner.sortCommands",
	quietest: "owner.sortQuietest",
	dashboard: "owner.sortDashboard",
	name: "owner.sortName",
};

export function guildFilterFrom(raw: string | null): OwnerGuildFilter {
	return oneOf(OWNER_GUILD_FILTERS, raw, "all");
}

export function snowflakeFrom(raw: string | null): string | null {
	return raw !== null && isSnowflake(raw) ? raw : null;
}

export function formatMs(ms: number): string {
	return ms < 1_000
		? formatUnit(ms, "millisecond")
		: formatUnit(ms / 1_000, "second", { digits: 1, display: "narrow" });
}

export function searchWith(current: URLSearchParams, changes: Record<string, string | null>): string {
	const merged = new URLSearchParams(current);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null) merged.delete(key);
		else merged.set(key, value);
	}
	return `?${merged.toString()}`;
}

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

/** Which of the API's `analytics_*` refusals this is, so the tab says why rather than showing a generic error. */
export function analyticsProblemOf(error: unknown): AnalyticsProblem | null {
	if (!(error instanceof ApiError)) return null;
	return ANALYTICS_PROBLEMS.find((problem) => error.code === `analytics_${problem}`) ?? null;
}

/** The collector's own pages, only for an address that is the web; the API sends an origin, never anything else. */
export function collectorPage(collector: string, path = ""): string | null {
	return /^https?:\/\/[^/\s]+$/.test(collector) ? `${collector}${path}` : null;
}
