import { type CaseAction, CASE_ACTIONS } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const ACTION_LABELS: Record<CaseAction, TranslationKey> = {
	warn: "cases.warn",
	timeout: "cases.timeout",
	untimeout: "cases.untimeout",
	kick: "cases.kick",
	ban: "cases.ban",
	softban: "cases.softban",
	unban: "cases.unban",
};

export const ACTION_ORDER = CASE_ACTIONS;

export function isCaseAction(value: string): value is CaseAction {
	return (CASE_ACTIONS as readonly string[]).includes(value);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** In the largest whole unit, worded by the browser in the reader's own language. */
export function durationText(ms: number, locale: string): string {
	const [value, unit] =
		ms % DAY === 0 ? [ms / DAY, "day"] : ms % HOUR === 0 ? [ms / HOUR, "hour"] : [Math.round(ms / MINUTE), "minute"];
	return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value);
}

/** The query the list asks with, leaving out what is at its default so a cache key stays short. */
export function caseSearch(options: { page: number; query: string; action: CaseAction | null }): string {
	const params = new URLSearchParams();
	if (options.page > 1) params.set("page", String(options.page));
	if (options.query !== "") params.set("q", options.query);
	if (options.action !== null) params.set("action", options.action);
	const text = params.toString();
	return text === "" ? "" : `?${text}`;
}
