import {
	stepValue,
	WARN_LIMITS,
	WARN_STEP_CHOICES,
	type WarnOutcome,
	type WarnProblem,
	type WarnStep,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";

/** The rules behind the warnings screen, kept out of the page so they can be tested without rendering. */

const TIMEOUT_KEYS: Record<number, TranslationKey> = {
	5: "warnings.timeout5",
	10: "warnings.timeout10",
	30: "warnings.timeout30",
	60: "warnings.timeout60",
	360: "warnings.timeout360",
	1_440: "warnings.timeout1440",
	10_080: "warnings.timeout10080",
};

const PROBLEM_KEYS: Record<WarnProblem, TranslationKey> = {
	left: "warnings.problemLeft",
	outranked: "warnings.problemOutranked",
	refused: "warnings.problemRefused",
};

export function stepText(step: WarnStep, t: TFunction): string {
	switch (step.action) {
		case "warn":
			return t("warnings.stepWarn");
		case "timeout":
			return t(TIMEOUT_KEYS[step.minutes] ?? "warnings.stepTimeout");
		case "kick":
			return t("warnings.stepKick");
		case "ban":
			return t("warnings.stepBan");
	}
}

export const STEP_OPTIONS = WARN_STEP_CHOICES.map((step) => ({ step, value: stepValue(step) }));

/** What happened to the member, in the sentence shown under the form that issued the warning. */
export function outcomeText(outcome: WarnOutcome, t: TFunction): string {
	const count = outcome.count;
	if (outcome.step === null) return t("warnings.outcomeNone", { count });
	if (outcome.problem !== null) {
		return t("warnings.outcomeFailed", {
			count,
			step: stepText(outcome.step, t),
			why: t(PROBLEM_KEYS[outcome.problem]),
		});
	}
	if (outcome.step.action === "warn") return t("warnings.outcomeWarnOnly", { count });

	return t("warnings.outcomeDone", { count, step: stepText(outcome.step, t) });
}

export function replaceStep(steps: readonly WarnStep[], index: number, step: WarnStep): WarnStep[] {
	return steps.map((current, at) => (at === index ? step : current));
}

/** A new step starts as a plain warning, so adding one never punishes anybody until somebody chooses to. */
export function addStep(steps: readonly WarnStep[]): WarnStep[] {
	return steps.length >= WARN_LIMITS.maxSteps ? [...steps] : [...steps, { action: "warn" }];
}

export function pageCountOf(total: number, perPage: number): number {
	return Math.max(1, Math.ceil(total / perPage));
}
