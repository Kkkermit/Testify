/**
 * Every date the dashboard renders, in one place.
 *
 * The locale is pinned rather than left to the browser: a bare `toLocaleString()` shows `7/30/2026` to one
 * admin and `30/07/2026` to another, and the two are unreadable as each other. `30 Jul 2026` cannot be
 * misread whoever is looking, which matters most on an audit trail.
 */

const LOCALE = "en-GB";

const DATE = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parse(iso: string): Date | null {
	const at = new Date(iso);
	return Number.isNaN(at.getTime()) ? null : at;
}

/** An unparseable value is returned as it arrived — a stored string nobody can read still says more than `Invalid Date`. */
function format(iso: string, using: Intl.DateTimeFormat): string {
	const at = parse(iso);
	return at === null ? iso : using.format(at);
}

export function shortDate(iso: string): string {
	return format(iso, DATE);
}

export function dateAndTime(iso: string): string {
	return format(iso, DATE_TIME);
}

export function clockTime(iso: string): string {
	return format(iso, TIME);
}

/**
 * How long ago, for a list read newest-first. Past a week the elapsed time stops being the useful fact and the
 * date takes over, so a year-old record does not read as "53 weeks ago".
 */
export function since(iso: string, now = Date.now()): string {
	const at = parse(iso);
	if (at === null) return iso;

	const elapsed = now - at.getTime();
	if (elapsed < 0) return dateAndTime(iso);
	if (elapsed < MINUTE) return "just now";

	if (elapsed < HOUR) {
		const minutes = Math.floor(elapsed / MINUTE);
		return `${String(minutes)} minute${minutes === 1 ? "" : "s"} ago`;
	}

	if (elapsed < DAY) {
		const hours = Math.floor(elapsed / HOUR);
		return `${String(hours)} hour${hours === 1 ? "" : "s"} ago`;
	}

	if (elapsed < 7 * DAY) {
		const days = Math.floor(elapsed / DAY);
		return `${String(days)} day${days === 1 ? "" : "s"} ago`;
	}

	return shortDate(iso);
}
