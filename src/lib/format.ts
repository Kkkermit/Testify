import { escapeMarkdown as djsEscapeMarkdown } from "discord.js";
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from "../config/constants";
import { theme } from "../config/theme";

/** Compact duration: "2h 5m 3s". Zero and negative values collapse to "0s". */
export function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return "0s";

	const days = Math.floor(ms / DAY_MS);
	const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
	const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
	const seconds = Math.floor((ms % MINUTE_MS) / SECOND_MS);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
	return parts.join(" ");
}

/** Prose duration: "2 hours, 5 minutes". */
export function formatDurationLong(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return "0 seconds";

	const units: [number, string][] = [
		[DAY_MS, "day"],
		[HOUR_MS, "hour"],
		[MINUTE_MS, "minute"],
		[SECOND_MS, "second"],
	];

	const parts: string[] = [];
	let remaining = ms;
	for (const [size, label] of units) {
		const value = Math.floor(remaining / size);
		remaining %= size;
		if (value > 0) parts.push(`${value} ${label}${value === 1 ? "" : "s"}`);
	}
	return parts.length > 0 ? parts.join(", ") : "0 seconds";
}

/** Time remaining until a future instant, or "ready now" once it has passed. */
export function formatCooldown(until: Date | number, now: number = Date.now()): string {
	const target = until instanceof Date ? until.getTime() : until;
	const remaining = target - now;
	return remaining <= 0 ? "ready now" : formatDuration(remaining);
}

export function formatUptime(startedAt: number, now: number = Date.now()): string {
	return formatDurationLong(now - startedAt);
}

/** Clock-style duration for track positions: "3:07" or "1:02:33". */
export function formatTrackTime(ms: number): string {
	const total = Math.max(0, Math.floor(ms / SECOND_MS));
	const hours = Math.floor(total / 3_600);
	const minutes = Math.floor((total % 3_600) / 60);
	const seconds = total % 60;
	const pad = (value: number): string => value.toString().padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function ordinal(n: number): string {
	const abs = Math.abs(Math.trunc(n));
	const lastTwo = abs % 100;
	if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
	switch (abs % 10) {
		case 1:
			return `${n}st`;
		case 2:
			return `${n}nd`;
		case 3:
			return `${n}rd`;
		default:
			return `${n}th`;
	}
}

export function formatNumber(n: number): string {
	return n.toLocaleString("en-US");
}

/** "1.2K", "3.4M" — for leaderboards and tight embed fields. */
export function compactNumber(n: number): string {
	return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatCurrency(amount: number): string {
	return `${theme.currency} ${formatNumber(amount)}`;
}

export function formatBytes(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = Math.max(0, bytes);
	let unit = 0;
	while (value >= 1_024 && unit < units.length - 1) {
		value /= 1_024;
		unit += 1;
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export type TimestampStyle = "t" | "T" | "d" | "D" | "f" | "F" | "R";

/** Discord renders these in each viewer's own locale and timezone, and keeps them live. */
export function discordTime(date: Date | number, style: TimestampStyle = "f"): string {
	const seconds = Math.floor((date instanceof Date ? date.getTime() : date) / 1_000);
	return `<t:${seconds}:${style}>`;
}

export function relativeTime(date: Date | number): string {
	return discordTime(date, "R");
}

export function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function escapeMarkdown(text: string): string {
	return djsEscapeMarkdown(text);
}

export function titleCase(text: string): string {
	return text
		.split(/[\s_-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

/** "MANAGE_ROLES" / "ManageRoles" → "manage roles", for permission listings. */
export function humanisePermission(flag: string): string {
	return flag
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase()
		.trim();
}

export function progressBar(value: number, total: number, size = 20): string {
	if (total <= 0) return "▬".repeat(size);
	const ratio = Math.min(1, Math.max(0, value / total));
	const position = Math.min(size - 1, Math.floor(ratio * size));
	return `${"▬".repeat(position)}🔘${"▬".repeat(size - position - 1)}`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
	return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
