import { type RunOutcome, type RunRow, type RunsFilters } from "@testify/shared";
import { type BadgeTone } from "@/components/primitives/Badge";
import { type TranslationKey } from "@/i18n";

const SNOWFLAKE = /^\d{17,20}$/;

/** Only an exact id looks a person up: nothing here searches by name or by part of an id. */
export function idFromLookup(text: string): string | null {
	const trimmed = text.trim();
	return SNOWFLAKE.test(trimmed) ? trimmed : null;
}

export const OUTCOME_CHOICES = ["all", "failed", "ok"] as const;

export type OutcomeChoice = (typeof OUTCOME_CHOICES)[number];

export const OUTCOME_CHOICE_LABELS: Record<OutcomeChoice, TranslationKey> = {
	all: "owner.runs.outcomeAll",
	failed: "owner.runs.outcomeFailed",
	ok: "owner.runs.outcomeOk",
};

export const choiceOf = (filters: RunsFilters): OutcomeChoice =>
	filters.outcome === "ok" ? "ok" : filters.outcome === undefined ? "all" : "failed";

/** A filter left out is no filter, so clearing one removes its key rather than sending it empty. */
export function narrowed(filters: RunsFilters, change: Partial<Record<keyof RunsFilters, string | null>>): RunsFilters {
	const next: Record<string, string> = {};
	for (const [key, value] of Object.entries({ ...filters, ...change })) {
		if (typeof value === "string" && value !== "") next[key] = value;
	}
	return next;
}

export const OUTCOME_LABELS: Record<RunOutcome, TranslationKey> = {
	ok: "owner.runs.ok",
	error: "owner.runs.error",
	timeout: "owner.runs.timeout",
	no_response: "owner.runs.noResponse",
};

export const OUTCOME_TONES: Record<RunOutcome, BadgeTone> = {
	ok: "success",
	error: "danger",
	timeout: "warning",
	no_response: "danger",
};

const KIND_LABELS: Record<string, TranslationKey> = {
	chat_input: "owner.runs.kindSlash",
	message_command: "owner.runs.kindPrefix",
	user_context: "owner.runs.kindMember",
	message_context: "owner.runs.kindMessage",
	button: "owner.runs.kindButton",
	select: "owner.runs.kindMenu",
	modal_submit: "owner.runs.kindForm",
};

/** The kind Discord gave the run, worded, or null for one this list has no name for. */
export const kindLabel = (kind: string): TranslationKey | null => KIND_LABELS[kind] ?? null;

/** What was run, as somebody would type it: a command with its subcommand, or a component's handler. */
export function runWhat(row: Pick<RunRow, "command" | "sub" | "handler">): string | null {
	if (row.command !== null) return row.sub === null ? `/${row.command}` : `/${row.command} ${row.sub}`;
	return row.handler;
}
