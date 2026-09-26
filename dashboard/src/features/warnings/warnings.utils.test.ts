import { WARN_LIMITS, WARN_STEP_CHOICES, type WarnStep } from "@testify/shared";
import { addStep, outcomeText, pageCountOf, replaceStep, stepText } from "@/features/warnings/warnings.utils";
import { t } from "@/test/english";

describe("stepText", () => {
	/** Every choice a picker offers has to read as words, never as a raw key. */
	it("names every step a server can choose", () => {
		for (const step of WARN_STEP_CHOICES) expect(stepText(step, t)).not.toMatch(/^warnings\./);
	});

	it("says how long a timeout lasts", () => {
		expect(stepText({ action: "timeout", minutes: 10 }, t)).toBe("Time out for 10 minutes");
	});
});

describe("outcomeText", () => {
	it("says nothing more happened when no punishments are set", () => {
		expect(outcomeText({ count: 1, step: null, problem: null }, t)).toMatch(/No punishments are set/);
	});

	it("names the step that was carried out", () => {
		expect(outcomeText({ count: 3, step: { action: "kick" }, problem: null }, t)).toBe("Warning 3 recorded: Kick.");
	});

	/** The warning still counts even when the bot could not act, and the reader has to learn which. */
	it("says why a step could not be carried out", () => {
		expect(outcomeText({ count: 4, step: { action: "ban" }, problem: "outranked" }, t)).toMatch(
			/Ban could not be done: .*highest role/,
		);
	});
});

describe("the step list", () => {
	const steps: WarnStep[] = [{ action: "warn" }, { action: "kick" }];

	it("changes one step and leaves the rest", () => {
		expect(replaceStep(steps, 1, { action: "ban" })).toEqual([{ action: "warn" }, { action: "ban" }]);
	});

	it("adds a plain warning, so nobody is punished until somebody chooses to", () => {
		expect(addStep(steps).at(-1)).toEqual({ action: "warn" });
	});

	it("stops adding at the limit", () => {
		const full = Array.from({ length: WARN_LIMITS.maxSteps }, (): WarnStep => ({ action: "warn" }));
		expect(addStep(full)).toHaveLength(WARN_LIMITS.maxSteps);
	});
});

describe("pageCountOf", () => {
	it("always has at least one page", () => {
		expect(pageCountOf(0, 20)).toBe(1);
		expect(pageCountOf(41, 20)).toBe(3);
	});
});
