import {
	banBody,
	confirmsName,
	stepFor,
	stepFromValue,
	stepValue,
	WARN_LIMITS,
	WARN_STEP_CHOICES,
	type WarnStep,
	warnLadderPut,
} from "@testify/shared";

const LADDER: WarnStep[] = [
	{ action: "warn" },
	{ action: "timeout", minutes: 10 },
	{ action: "kick" },
	{ action: "ban" },
];

describe("stepFor", () => {
	it("gives each warning the step at its own number", () => {
		expect(stepFor(LADDER, 1)).toEqual({ action: "warn" });
		expect(stepFor(LADDER, 2)).toEqual({ action: "timeout", minutes: 10 });
		expect(stepFor(LADDER, 4)).toEqual({ action: "ban" });
	});

	/** A fifth warning on a four-step ladder is not a free pass: the harshest step repeats. */
	it("repeats the last step past the end of the list", () => {
		expect(stepFor(LADDER, 9)).toEqual({ action: "ban" });
	});

	it("does nothing for a server with no steps set", () => {
		expect(stepFor([], 3)).toBeNull();
	});

	it("does nothing for a count below one", () => {
		expect(stepFor(LADDER, 0)).toBeNull();
	});
});

describe("stepValue and stepFromValue", () => {
	it("round-trips every step a server can choose", () => {
		for (const step of WARN_STEP_CHOICES) expect(stepFromValue(stepValue(step))).toEqual(step);
	});

	/** A select menu's value arrives from Discord, so a length nobody offered must not become a timeout. */
	it("refuses a timeout length that is not on the list", () => {
		expect(stepFromValue("timeout-7")).toBeNull();
		expect(stepFromValue("timeout-")).toBeNull();
	});

	it("refuses an action that does not exist", () => {
		expect(stepFromValue("softban")).toBeNull();
	});
});

describe("warnLadderPut", () => {
	it("takes a list of steps", () => {
		expect(warnLadderPut.safeParse({ steps: LADDER }).success).toBe(true);
	});

	it("refuses more steps than the panel can show", () => {
		const long = Array.from({ length: WARN_LIMITS.maxSteps + 1 }, () => ({ action: "warn" }));
		expect(warnLadderPut.safeParse({ steps: long }).success).toBe(false);
	});

	it("refuses a timeout with no length", () => {
		expect(warnLadderPut.safeParse({ steps: [{ action: "timeout" }] }).success).toBe(false);
	});
});

describe("confirmsName", () => {
	it("accepts the username typed back, whatever its case or spacing", () => {
		expect(confirmsName("  Someone ", "someone")).toBe(true);
	});

	it("refuses anything else", () => {
		expect(confirmsName("someon", "someone")).toBe(false);
	});

	/** An empty name compared with an empty box would otherwise confirm a ban on nothing typed. */
	it("refuses an empty name", () => {
		expect(confirmsName("", "")).toBe(false);
	});
});

describe("banBody", () => {
	it("keeps the message deletion within Discord's seven days", () => {
		expect(banBody.safeParse({ reason: "spam", confirm: "x", deleteDays: 8 }).success).toBe(false);
		expect(banBody.parse({ reason: "spam", confirm: "x" }).deleteDays).toBe(0);
	});
});
