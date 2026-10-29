import {
	banBody,
	confirmsName,
	idFromQuery,
	stepFor,
	stepFromValue,
	storedStep,
	WARN_LIMITS,
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
	/** A fifth warning on a four-step ladder is not a free pass: the harshest step repeats. */
	it("repeats the last step past the end of the list", () => {
		expect(stepFor(LADDER, 9)).toEqual({ action: "ban" });
	});
});

describe("stepValue and stepFromValue", () => {
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
	it("refuses more steps than the panel can show", () => {
		const long = Array.from({ length: WARN_LIMITS.maxSteps + 1 }, () => ({ action: "warn" }));
		expect(warnLadderPut.safeParse({ steps: long }).success).toBe(false);
	});

	it("refuses a timeout with no length", () => {
		expect(warnLadderPut.safeParse({ steps: [{ action: "timeout" }] }).success).toBe(false);
	});
});

describe("confirmsName", () => {
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
});

describe("warningMatches", () => {
	const record = { userId: "123456789012345678", username: "KateBush" };

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
