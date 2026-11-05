import { formattingLocale, formatUnit } from "@/lib/intl";

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "2-digit", minute: "2-digit" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
const WEEKDAY: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
const HOUR_MINUTE: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
const MONTH: Intl.DateTimeFormatOptions = { month: "long", timeZone: "UTC" };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const formatters = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function made<T extends Intl.DateTimeFormat | Intl.RelativeTimeFormat>(key: string, make: (locale: string) => T): T {
	const locale = formattingLocale();
	const known = formatters.get(`${locale} ${key}`);
	if (known !== undefined) return known as T;

	const fresh = make(locale);
	formatters.set(`${locale} ${key}`, fresh);
	return fresh;
}

function parse(iso: string): Date | null {
	const at = new Date(iso);
	return Number.isNaN(at.getTime()) ? null : at;
}

function format(iso: string, name: string, options: Intl.DateTimeFormatOptions): string {
	const at = parse(iso);
	return at === null ? iso : made(name, (locale) => new Intl.DateTimeFormat(locale, options)).format(at);
}

export function shortDate(iso: string): string {
	return format(iso, "date", DATE);
}

export function dateAndTime(iso: string): string {
	return format(iso, "dateTime", DATE_TIME);
}

export function weekdayDate(iso: string): string {
	return format(iso, "weekday", WEEKDAY);
}

export function timeOfDay(iso: string): string {
	return format(iso, "hourMinute", HOUR_MINUTE);
}

/** `1 Aug`, a calendar day by itself, read in UTC because it names a stored day rather than a moment. */
export function dayAndMonth(iso: string): string {
	return format(iso, "dayMonth", DAY_MONTH);
}

export function monthName(month: number): string {
	return made("month", (locale) => new Intl.DateTimeFormat(locale, MONTH)).format(Date.UTC(2000, month - 1, 1));
}

export function clockTime(iso: string): string {
	return format(iso, "time", TIME);
}

export function since(iso: string, now = Date.now()): string {
	const at = parse(iso);
	if (at === null) return iso;

	const elapsed = now - at.getTime();
	if (elapsed < 0) return dateAndTime(iso);
	if (elapsed >= 7 * DAY) return shortDate(iso);

	if (elapsed < MINUTE)
		return made("now", (locale) => new Intl.RelativeTimeFormat(locale, { numeric: "auto" })).format(0, "second");

	const ago = made("ago", (locale) => new Intl.RelativeTimeFormat(locale, { numeric: "always" }));
	if (elapsed < HOUR) return ago.format(-Math.floor(elapsed / MINUTE), "minute");
	if (elapsed < DAY) return ago.format(-Math.floor(elapsed / HOUR), "hour");
	return ago.format(-Math.floor(elapsed / DAY), "day");
}

export function ahead(ms: number): string {
	const later = made("ahead", (locale) => new Intl.RelativeTimeFormat(locale, { numeric: "always" }));
	if (ms < HOUR) return later.format(Math.max(1, Math.round(ms / MINUTE)), "minute");
	if (ms < DAY) return later.format(Math.round(ms / HOUR), "hour");
	return later.format(Math.round(ms / DAY), "day");
}

export function formatUptime(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const part = (value: number, unit: "day" | "hour" | "minute"): string =>
		formatUnit(value, unit, { display: "narrow" });

	if (days > 0) return `${part(days, "day")} ${part(hours % 24, "hour")}`;
	if (hours > 0) return `${part(hours, "hour")} ${part(minutes % 60, "minute")}`;

	return part(minutes, "minute");
}
