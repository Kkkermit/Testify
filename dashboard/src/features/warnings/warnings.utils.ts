import {
	type MemberWarning,
	stepValue,
	WARN_LIMITS,
	WARN_STEP_CHOICES,
	type WarnOutcome,
	type WarnProblem,
	type WarnStep,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { type BadgeTone } from "@/components/primitives";
import { type TranslationKey } from "@/i18n";

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

export function actionOf(
	warning: Pick<MemberWarning, "step" | "stepProblem">,
	t: TFunction,
): { label: string; tone: BadgeTone } {
	const step = warning.step;
	if (step === null || step.action === "warn") return { label: t("warnings.stepWarn"), tone: "muted" };
	if (warning.stepProblem !== null)
		return { label: t("warnings.notCarriedOut", { step: stepText(step, t) }), tone: "warning" };

	return { label: stepText(step, t), tone: step.action === "timeout" ? "warning" : "danger" };
}

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

export function addStep(steps: readonly WarnStep[]): WarnStep[] {
	return steps.length >= WARN_LIMITS.maxSteps ? [...steps] : [...steps, { action: "warn" }];
}

export function pageCountOf(total: number, perPage: number): number {
	return Math.max(1, Math.ceil(total / perPage));
}

export function warningsSummary(steps: readonly WarnStep[], t: TFunction): string {
	const last = steps.at(-1);
	if (last === undefined) return t("warnings.summaryNone");
	return t("warnings.summary", { count: steps.length, last: stepText(last, t) });
}
