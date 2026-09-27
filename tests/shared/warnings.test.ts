import {
	banBody,
	confirmsName,
	idFromQuery,
	stepFor,
	stepFromValue,
	stepValue,
	storedStep,
	WARN_LIMITS,
	WARN_STEP_CHOICES,
	type WarnStep,
	warningMatches,
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

	it("accepts their Discord ID instead of the name", () => {
		expect(confirmsName(" 100000000000000002 ", "someone", "100000000000000002")).toBe(true);
		expect(confirmsName("100000000000000003", "someone", "100000000000000002")).toBe(false);
	});

	/** An empty name compared with an empty box would otherwise confirm a ban on nothing typed. */
	it("refuses an empty name", () => {
		expect(confirmsName("", "")).toBe(false);
		expect(confirmsName("", "", "")).toBe(false);
	});
});

describe("storedStep", () => {
	it("reads a stored step and its problem back", () => {
		expect(storedStep("timeout-10", "left")).toEqual({ step: { action: "timeout", minutes: 10 }, stepProblem: "left" });
	});

	/** Migrate on read: a record from before punishments has neither field, and one edited by hand can hold anything. */
	it("reads a missing or unknown step as a plain warning", () => {
		expect(storedStep(undefined, undefined)).toEqual({ step: null, stepProblem: null });
		expect(storedStep("explode", "left")).toEqual({ step: null, stepProblem: null });
		expect(storedStep("kick", "gremlins")).toEqual({ step: { action: "kick" }, stepProblem: null });
	});
});

describe("idFromQuery", () => {
	it("reads a pasted ID and a copied mention as the ID they name", () => {
		expect(idFromQuery("100000000000000002")).toBe("100000000000000002");
		expect(idFromQuery(" <@100000000000000002> ")).toBe("100000000000000002");
		expect(idFromQuery("<@!100000000000000002>")).toBe("100000000000000002");
	});

	it("leaves a name, or a number too short to be an ID, as a name", () => {
		expect(idFromQuery("kate")).toBeNull();
		expect(idFromQuery("12345")).toBeNull();
		expect(idFromQuery("<@&100000000000000002>")).toBeNull();
	});
});

describe("warningMatches", () => {
	const record = { userId: "123456789012345678", username: "KateBush" };

	it("finds a name anywhere in it, whatever the case", () => {
		expect(warningMatches(record, "bush")).toBe(true);
		expect(warningMatches(record, "prince")).toBe(false);
	});

	it("finds an ID or a mention exactly", () => {
		expect(warningMatches(record, "123456789012345678")).toBe(true);
		expect(warningMatches(record, "<@!123456789012345678>")).toBe(true);
	});

	/** A username full of digits must not answer for somebody else's ID. */
	it("never matches an ID against the name", () => {
		expect(warningMatches({ userId: "1", username: "fan987654321098765432" }, "987654321098765432")).toBe(false);
	});
});

describe("banBody", () => {
	it("keeps the message deletion within Discord's seven days", () => {
		expect(banBody.safeParse({ reason: "spam", confirm: "x", deleteDays: 8 }).success).toBe(false);
		expect(banBody.parse({ reason: "spam", confirm: "x" }).deleteDays).toBe(0);
	});
});
