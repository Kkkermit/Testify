import { type HistoryLevel, type StatusDay, type StatusLevel } from "@testify/shared";
import { type BadgeTone } from "@/components/primitives";
import { type TranslationKey } from "@/i18n";

export const LEVEL_TONE: Record<StatusLevel, BadgeTone> = {
	operational: "success",
	degraded: "warning",
	down: "danger",
	unknown: "muted",
};

export const LEVEL_LABEL: Record<StatusLevel, TranslationKey> = {
	operational: "status.operational",
	degraded: "status.degraded",
	down: "status.down",
	unknown: "status.unknown",
};

export const HEADLINE: Record<StatusLevel, TranslationKey> = {
	operational: "status.headlineOperational",
	degraded: "status.headlineDegraded",
	down: "status.headlineDown",
	unknown: "status.headlineUnknown",
};

export const HISTORY_LABEL: Record<HistoryLevel, TranslationKey> = {
	...LEVEL_LABEL,
	offline: "status.offline",
	none: "status.noData",
};

export const HISTORY_FILL: Record<HistoryLevel, string> = {
	operational: "bg-success",
	degraded: "bg-warning",
	down: "bg-destructive",
	unknown: "bg-muted",
	offline: "bg-destructive",
	none: "bg-muted",
};

/** Three nines is a clean day; anything under 95% lost more than an hour. */
export function dayFill(uptime: number | null): string {
	if (uptime === null) return "bg-muted";
	if (uptime >= 0.999) return "bg-success";
	return uptime >= 0.95 ? "bg-warning" : "bg-destructive";
}

/** Days with no heartbeat yet are left out, so a bot installed yesterday is not reported as 3% up. */
export function averageUptime(days: StatusDay[]): number | null {
	const known = days.flatMap((day) => (day.uptime === null ? [] : [day.uptime]));
	if (known.length === 0) return null;

	return known.reduce((sum, uptime) => sum + uptime, 0) / known.length;
}

/** Two decimals, because 99.9% and 99.99% are eight hours a year apart; a clean 100% keeps none. */
export function percent(share: number): string {
	const value = Math.min(100, Math.max(0, share * 100));

	return value === 100 ? "100%" : `${(Math.floor(value * 100) / 100).toFixed(2)}%`;
}

export function millis(value: number | null): string {
	return value === null ? "—" : `${Math.round(value).toLocaleString("en-GB")} ms`;
}

const SERVICE_NAMES: Record<string, string> = {
	adviceslip: "Advice Slip",
	"google-translate": "Google Translate",
	icanhazdadjoke: "icanhazdadjoke",
	mcsrvstat: "mcsrvstat.us",
	pokeapi: "PokéAPI",
	reddit: "Reddit",
	"some-random-api": "Some Random API",
	wikipedia: "Wikipedia",
};

export function serviceName(name: string): string {
	return SERVICE_NAMES[name] ?? name;
}

/** A share of the tallest bar, with a floor so a fast reading still draws something to hover. */
export function barHeight(value: number | null, tallest: number): number {
	if (value === null || tallest <= 0) return 0;

	return Math.max(8, Math.round((value / tallest) * 100));
}
