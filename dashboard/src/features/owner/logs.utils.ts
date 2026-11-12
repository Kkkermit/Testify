import { logRunParams, type LogRun } from "@testify/shared";
import { type TFunction } from "i18next";
import { dateAndTime } from "@/lib/datetime";

/** An error as the bot stores it: its stack, every other field it carried, and what caused it. */
export interface ErrorBlock {
	key: string;
	stack: string;
	fields: Record<string, unknown>;
	cause: ErrorBlock | null;
}

/** The fields the bot always writes for an error, so anything else beside them is something the error carried. */
const OWN = new Set(["name", "message", "stack", "cause"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorOf(key: string, value: unknown, depth = 0): ErrorBlock | null {
	if (!isRecord(value) || depth > 8) return null;

	const { name, message, stack } = value;
	const text =
		typeof stack === "string"
			? stack
			: typeof name === "string" && typeof message === "string"
				? `${name}: ${message}`
				: null;
	if (text === null) return null;

	const fields = Object.fromEntries(Object.entries(value).filter(([field]) => !OWN.has(field)));
	const cause = errorOf("cause", value.cause, depth + 1);
	if (cause === null && value.cause !== undefined) fields.cause = value.cause;

	return { key, stack: text, fields, cause };
}

/** Splits a line's context into the errors it holds, each with its whole stack, and everything else. */
export function errorsIn(context: Record<string, unknown>): {
	errors: ErrorBlock[];
	rest: Record<string, unknown>;
} {
	const errors: ErrorBlock[] = [];
	const rest: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(context)) {
		const error = errorOf(key, value);
		if (error === null) rest[key] = value;
		else errors.push(error);
	}

	return { errors, rest };
}

function inline(value: unknown): string {
	if (value === null || value === undefined) return String(value);
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);

	const message = isRecord(value) ? value.message : undefined;
	return typeof message === "string" ? message : JSON.stringify(value).slice(0, 200);
}

/** One line of `key=value` pairs under the message; an error shows its message, and its stack is one click away. */
export function contextSummary(context: Record<string, unknown>): string {
	return Object.entries(context)
		.map(([key, value]) => `${key}=${inline(value)}`)
		.join("  ");
}

export function prettyJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

/** Only an id the API would accept, so a hand-edited address never asks for anything else. */
export function runFrom(raw: string | null): string | null {
	return raw !== null && logRunParams.safeParse({ runId: raw }).success ? raw : null;
}

export function runTitle(run: LogRun, t: TFunction): string {
	return run.current ? t("owner.runNow") : dateAndTime(run.startedAt);
}

export interface RunDetail {
	text: string;
	/** Something went wrong in it, which the list colours so a crash stands out among six runs. */
	alarm: boolean;
}

/** When it started or ended, how much it holds and what went wrong, in the order a reader scans for. */
export function runDetails(run: LogRun, t: TFunction): RunDetail[] {
	const parts: RunDetail[] = [];
	const add = (text: string, alarm = false): void => {
		parts.push({ text, alarm });
	};

	if (run.current) add(t("owner.runStarted", { time: dateAndTime(run.startedAt) }));
	else if (run.endedAt !== null) add(t("owner.runEnded", { time: dateAndTime(run.endedAt) }));
	else if (run.lastAt !== null) add(t("owner.runNoShutdown", { time: dateAndTime(run.lastAt) }), true);
	else add(t("owner.runNoShutdownEmpty"), true);

	add(t("owner.runLines", { count: run.lines }));
	if (run.errors > 0) add(t("owner.runErrors", { count: run.errors }), true);
	if (run.warnings > 0) add(t("owner.runWarnings", { count: run.warnings }));
	add(t("owner.runVersion", { version: run.version }));

	return parts;
}
