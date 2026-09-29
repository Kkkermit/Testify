import { ANALYTICS_WINDOWS, LOG_LEVELS, snowflake, type AnalyticsWindow, type ReportedLogLevel } from "@testify/shared";
import { oneOf } from "@/lib/oneOf";

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
