import { WARN_LIMITS, WARN_STEP_CHOICES, type WarnStep } from "@testify/shared";
import { actionOf, addStep, outcomeText, stepText } from "@/features/warnings/warnings.utils";
import { t } from "@/test/english";

describe("stepText", () => {
	/** Every choice a picker offers has to read as words, never as a raw key. */
	it("names every step a server can choose", () => {
		for (const step of WARN_STEP_CHOICES) expect(stepText(step, t)).not.toMatch(/^warnings\./);
	});
});

describe("outcomeText", () => {
	/** The warning still counts even when the bot could not act, and the reader has to learn which. */
	it("says why a step could not be carried out", () => {
		expect(outcomeText({ count: 4, step: { action: "ban" }, problem: "outranked" }, t)).toMatch(
			/Ban could not be done: .*highest role/,
		);
	});
});

describe("actionOf", () => {
	/** A ban that never happened must not read as one that did. */
	it("says when the step was not carried out", () => {
		expect(actionOf({ step: { action: "kick" }, stepProblem: "outranked" }, t).label).toBe("Kick (not carried out)");
	});
});

describe("the step list", () => {
	it("stops adding at the limit", () => {
		const full = Array.from({ length: WARN_LIMITS.maxSteps }, (): WarnStep => ({ action: "warn" }));
		expect(addStep(full)).toHaveLength(WARN_LIMITS.maxSteps);
	});
});
