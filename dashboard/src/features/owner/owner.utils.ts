import {
	ANALYTICS_WINDOWS,
	LOG_LEVELS,
	OWNER_GUILD_FILTERS,
	OWNER_GUILD_SORTS,
	snowflake,
	type AnalyticsWindow,
	type CommandRunRow,
	type OwnerGuildFilter,
	type OwnerGuildSort,
	type ReportedLogLevel,
} from "@testify/shared";
import { type TranslationKey } from "@/i18n";
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

export function commandFrom(raw: string | null): string | null {
	return raw !== null && /^[\w-]{1,32}$/.test(raw) ? raw : null;
}

export function formatMs(ms: number): string {
	return ms < 1_000
		? formatUnit(ms, "millisecond")
		: formatUnit(ms / 1_000, "second", { digits: 1, display: "narrow" });
}

export function runName(run: Pick<CommandRunRow, "command" | "subcommand">): string {
	return run.subcommand === null ? `/${run.command}` : `/${run.command} ${run.subcommand}`;
}

export function searchWith(current: URLSearchParams, changes: Record<string, string | null>): string {
	const merged = new URLSearchParams(current);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null) merged.delete(key);
		else merged.set(key, value);
	}
	return `?${merged.toString()}`;
}
