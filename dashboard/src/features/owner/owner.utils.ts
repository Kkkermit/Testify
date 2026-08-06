import { ANALYTICS_WINDOWS, LOG_LEVELS, type AnalyticsWindow, type ReportedLogLevel } from "@testify/shared";

/** A page number out of a URL can be anything at all. */
export function pageFrom(raw: string | null): number {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function formatUptime(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${String(days)}d ${String(hours % 24)}h`;
	if (hours > 0) return `${String(hours)}h ${String(minutes % 60)}m`;

	return `${String(minutes)}m`;
}

export function pageCount(total: number, perPage: number): number {
	if (perPage <= 0) return 1;
	return Math.max(1, Math.ceil(total / perPage));
}

/** The API only accepts the three windows it aggregates for, so anything else falls back rather than 400s. */
export function windowFrom(raw: string | null): AnalyticsWindow {
	const parsed = Number(raw);
	return ANALYTICS_WINDOWS.find((option) => option === parsed) ?? 30;
}

/** Defaults to everything: the console exists to be looked through. */
export function levelFrom(raw: string | null): ReportedLogLevel {
	return LOG_LEVELS.find((option) => option === raw) ?? "trace";
}

/** A percentage of the busiest row, floored at 2 so a row with one use is still visibly a row. */
export function barWidth(count: number, max: number): number {
	if (max <= 0 || count <= 0) return 0;
	return Math.max(2, Math.round((count / max) * 100));
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

export function formatClock(iso: string): string {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return iso;

	return at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
