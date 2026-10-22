import {
	ANALYTICS_WINDOWS,
	LOG_LEVELS,
	OWNER_GUILD_SORTS,
	snowflake,
	type AnalyticsWindow,
	type CommandRunRow,
	type OwnerGuildSort,
	type ReportedLogLevel,
} from "@testify/shared";
import { type TranslationKey } from "@/i18n";
import { oneOf } from "@/lib/oneOf";

export const WINDOWS = ANALYTICS_WINDOWS.map((days) => ({ value: days, label: `${String(days)}d` }));

/** The API only accepts the three windows it aggregates for, so anything else falls back rather than 400s. */
export function windowFrom(raw: string | null): AnalyticsWindow {
	const parsed = Number(raw);
	return ANALYTICS_WINDOWS.find((option) => option === parsed) ?? 30;
}

/** Defaults to everything: the console exists to be looked through. */
export function levelFrom(raw: string | null): ReportedLogLevel {
	return oneOf(LOG_LEVELS, raw, "trace");
}

export function percent(part: number, whole: number): string {
	if (whole <= 0) return "0%";
	return `${(Math.round((part / whole) * 1000) / 10).toString()}%`;
}

/** `2026-08-01` as `1 Aug`, which is all a chart axis or a tooltip has room for. */
export function shortDay(day: string): string {
	const at = new Date(`${day}T00:00:00.000Z`);
	if (Number.isNaN(at.getTime())) return day;

	return at.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The same rule the API validates against, so the form cannot disagree with the refusal it would get. */
export function isSnowflake(value: string): boolean {
	return snowflake.safeParse(value).success;
}

/** A route pattern read as a screen name, so the list is scannable without decoding `:guildId` every row. */
export function screenLabel(route: string): string {
	const parts = route.split("/").filter((part) => part !== "" && !part.startsWith(":"));
	const last = parts.at(-1);

	if (last === undefined) return "Home";

	return last.replace(/-/g, " ").replace(/^./, (first) => first.toUpperCase());
}

/** Largest first is the default, because that is where a misconfigured server costs most. */
export function guildSortFrom(raw: string | null): OwnerGuildSort {
	return oneOf(OWNER_GUILD_SORTS, raw, "members");
}

export const GUILD_SORT_LABELS: Record<OwnerGuildSort, TranslationKey> = {
	members: "owner.sortMembers",
	fewest: "owner.sortFewest",
	newest: "owner.sortNewest",
	oldest: "owner.sortOldest",
	commands: "owner.sortCommands",
	dashboard: "owner.sortDashboard",
	name: "owner.sortName",
};

/** A filter out of the URL that the API would refuse is dropped, so a mangled link shows everything rather than a 400. */
export function snowflakeFrom(raw: string | null): string | null {
	return raw !== null && isSnowflake(raw) ? raw : null;
}

export function commandFrom(raw: string | null): string | null {
	return raw !== null && /^[\w-]{1,32}$/.test(raw) ? raw : null;
}

/** `/music play`, the way it was typed. */
export function runName(run: Pick<CommandRunRow, "command" | "subcommand">): string {
	return run.subcommand === null ? `/${run.command}` : `/${run.command} ${run.subcommand}`;
}

/** The current query with some keys changed, for a link that keeps the tab and window it was found in. */
export function searchWith(current: URLSearchParams, changes: Record<string, string | null>): string {
	const merged = new URLSearchParams(current);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null) merged.delete(key);
		else merged.set(key, value);
	}
	return `?${merged.toString()}`;
}
