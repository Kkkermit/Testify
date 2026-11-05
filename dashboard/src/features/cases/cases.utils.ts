import { type CaseAction, CASE_ACTIONS } from "@testify/shared";
import { type TranslationKey } from "@/i18n";
import { formatUnit } from "@/lib/intl";

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

export function durationText(ms: number): string {
	if (ms % DAY === 0) return formatUnit(ms / DAY, "day", { display: "long" });
	if (ms % HOUR === 0) return formatUnit(ms / HOUR, "hour", { display: "long" });
	return formatUnit(Math.round(ms / MINUTE), "minute", { display: "long" });
}

export function caseSearch(options: { page: number; query: string; action: CaseAction | null }): string {
	const params = new URLSearchParams();
	if (options.page > 1) params.set("page", String(options.page));
	if (options.query !== "") params.set("q", options.query);
	if (options.action !== null) params.set("action", options.action);
	const text = params.toString();
	return text === "" ? "" : `?${text}`;
}
