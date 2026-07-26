import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS, WEEK_MS } from "../config/constants";

const UNITS: Record<string, number> = {
	s: SECOND_MS,
	sec: SECOND_MS,
	secs: SECOND_MS,
	second: SECOND_MS,
	seconds: SECOND_MS,
	m: MINUTE_MS,
	min: MINUTE_MS,
	mins: MINUTE_MS,
	minute: MINUTE_MS,
	minutes: MINUTE_MS,
	h: HOUR_MS,
	hr: HOUR_MS,
	hrs: HOUR_MS,
	hour: HOUR_MS,
	hours: HOUR_MS,
	d: DAY_MS,
	day: DAY_MS,
	days: DAY_MS,
	w: WEEK_MS,
	week: WEEK_MS,
	weeks: WEEK_MS,
};

const PATTERN = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi;

/**
 * Parses "10m", "2h30m", "1d 12h" into milliseconds. Replaces the `ms` package,
 * which was imported but never declared as a dependency.
 */
export function parseDuration(input: string): number | null {
	const trimmed = input.trim().toLowerCase();
	if (trimmed.length === 0) return null;

	// Bare numbers are treated as seconds, matching the old choice-list behaviour.
	if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10) * SECOND_MS;

	let total = 0;
	let matched = false;

	for (const match of trimmed.matchAll(PATTERN)) {
		const amount = Number.parseFloat(match[1]!);
		const unit = UNITS[match[2]!];
		if (unit === undefined || Number.isNaN(amount)) return null;
		total += amount * unit;
		matched = true;
	}

	return matched ? Math.round(total) : null;
}
