import { formattingLocale, formatUnit } from "@/lib/intl";

/** Every date the dashboard renders, in the reader's language, with the month always a word so `30 Jul 2026` cannot be misread. */

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "2-digit", minute: "2-digit" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

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

/** An unparseable value is returned as it arrived — a stored string nobody can read still says more than `Invalid Date`. */
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

export function clockTime(iso: string): string {
	return format(iso, "time", TIME);
}

/** How long ago, switching to the date past a week. */
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

/** `1d 1h`: the two largest units, each as short as the reader's language writes it. */
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
