import { z } from "zod";
import { WARNING_LIMITS } from "./memberDetail";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/** What a server's Nth warning does to the member, and the warnings list both surfaces read. */

/** Timeout lengths a step may use, in minutes; Discord's own ceiling is 28 days. */
export const WARN_TIMEOUT_MINUTES = [5, 10, 30, 60, 360, 1_440, 10_080] as const;

export const WARN_ACTIONS = ["warn", "timeout", "kick", "ban"] as const;

export type WarnAction = (typeof WARN_ACTIONS)[number];

export const WARN_LIMITS = {
	/** Discord allows 40 components a message, and each step on the panel costs two. */
	maxSteps: 10,
	perPage: 20,
	/** Discord's own window for deleting a banned member's messages. */
	maxDeleteDays: 7,
} as const;

export type WarnStep =
	| { action: "warn" }
	| { action: "timeout"; minutes: (typeof WARN_TIMEOUT_MINUTES)[number] }
	| { action: "kick" }
	| { action: "ban" };

const timeoutMinutes = z.union(WARN_TIMEOUT_MINUTES.map((minutes) => z.literal(minutes)));

export const warnStep = z.discriminatedUnion("action", [
	z.object({ action: z.literal("warn") }),
	z.object({ action: z.literal("timeout"), minutes: timeoutMinutes }),
	z.object({ action: z.literal("kick") }),
	z.object({ action: z.literal("ban") }),
]);

export const warnLadderPut = z.object({ steps: z.array(warnStep).max(WARN_LIMITS.maxSteps) });

export type WarnLadderPut = z.infer<typeof warnLadderPut>;

export interface WarnLadder {
	/** The first entry is what a first warning does, the second a second, and so on. */
	steps: WarnStep[];
}

/** The step a member's Nth warning triggers; past the end of the list, the last step repeats. */
export function stepFor(steps: readonly WarnStep[], count: number): WarnStep | null {
	if (steps.length === 0 || count < 1) return null;

	return steps[Math.min(count, steps.length) - 1] ?? null;
}

/** One string per step, so a select menu's value round-trips without a lookup table on either side. */
export function stepValue(step: WarnStep): string {
	return step.action === "timeout" ? `timeout-${String(step.minutes)}` : step.action;
}

export function stepFromValue(value: string): WarnStep | null {
	const parsed = warnStep.safeParse(
		value.startsWith("timeout-") ? { action: "timeout", minutes: Number(value.slice(8)) } : { action: value },
	);

	return parsed.success ? parsed.data : null;
}

/** Every step a server can choose, in the order a picker lists them. */
export const WARN_STEP_CHOICES: readonly WarnStep[] = [
	{ action: "warn" },
	...WARN_TIMEOUT_MINUTES.map((minutes) => ({ action: "timeout" as const, minutes })),
	{ action: "kick" },
	{ action: "ban" },
];

export interface GuildWarning {
	id: string;
	userId: string;
	/** The name stored when they were last warned, so somebody who has left still reads as a person. */
	username: string;
	reason: string;
	byId: string;
	byTag: string;
	at: string;
	edited: boolean;
}

export interface GuildWarningsPage {
	items: GuildWarning[];
	total: number;
	page: number;
	perPage: number;
}

export const warningsQuery = z.object({
	page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const warningAdd = z.object({
	userId: snowflake,
	reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason),
});

export type WarningAdd = z.infer<typeof warningAdd>;

/** Why a step could not be carried out: they had left, the bot sits too low or lacks the permission, or Discord said no. */
export const WARN_PROBLEMS = ["left", "outranked", "refused"] as const;

export type WarnProblem = (typeof WARN_PROBLEMS)[number];

/** Where a warning's step landed, so whoever issued it learns what actually happened to the member. */
export interface WarnOutcome {
	count: number;
	step: WarnStep | null;
	/** Null when the step was carried out or there was nothing to do. */
	problem: WarnProblem | null;
}

export interface WarningAdded {
	warning: GuildWarning;
	outcome: WarnOutcome;
}

export const memberSearchQuery = z.object({ q: plainLine(1, 32) });

export interface MemberMatch {
	userId: string;
	displayName: string;
	username: string;
	avatarUrl: string | null;
}

/** The username, typed back, is the confirmation: a kick or a ban cannot be sent by a stray click. */
export const kickBody = z.object({
	reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason),
	confirm: z.string().max(64),
});

export type KickBody = z.infer<typeof kickBody>;

export const banBody = kickBody.extend({
	deleteDays: z.coerce.number().int().min(0).max(WARN_LIMITS.maxDeleteDays).default(0),
});

export type BanBody = z.infer<typeof banBody>;

/** Compared the same way on both sides, so the button the form enables is the request the server accepts. */
export function confirmsName(typed: string, username: string): boolean {
	return typed.trim().toLowerCase() === username.trim().toLowerCase() && username.trim() !== "";
}
