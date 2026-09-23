import { problemText } from "@lib/format/problemText.util";
import { GIVEAWAY_LIMITS, giveawayProblem, giveawayStart } from "@testify/shared";

/** The rules the form and the API share; mounting is covered by `server.test.ts`. */

const channelId = "400000000000000001";
const valid = { channelId, prize: "A copy of the game", winnerCount: 1, durationMs: 3_600_000 };

describe("giveawayStart", () => {
	it("accepts an ordinary giveaway", () => {
		expect(giveawayStart.safeParse(valid).success).toBe(true);
	});

	it("refuses a channel that is not a snowflake", () => {
		expect(giveawayStart.safeParse({ ...valid, channelId: "not-an-id" }).success).toBe(false);
	});

	it("refuses an empty prize and one past the limit", () => {
		expect(giveawayStart.safeParse({ ...valid, prize: "   " }).success).toBe(false);
		expect(giveawayStart.safeParse({ ...valid, prize: "x".repeat(GIVEAWAY_LIMITS.maxPrize + 1) }).success).toBe(false);
	});

	/** More winners than Discord will draw, or none at all, both have to be refused before the bot tries. */
	it("refuses a winner count outside what Discord allows", () => {
		expect(giveawayStart.safeParse({ ...valid, winnerCount: 0 }).success).toBe(false);
		expect(giveawayStart.safeParse({ ...valid, winnerCount: GIVEAWAY_LIMITS.maxWinners + 1 }).success).toBe(false);
	});

	/** A giveaway that ends in a second, or runs for a year, are both mistakes rather than intentions. */
	it("refuses a duration outside the bounds", () => {
		expect(giveawayStart.safeParse({ ...valid, durationMs: 1_000 }).success).toBe(false);
		expect(giveawayStart.safeParse({ ...valid, durationMs: GIVEAWAY_LIMITS.maxDurationMs + 1 }).success).toBe(false);
	});

	/** A prize reading one way in the box that saved it and another in Discord is the Trojan Source problem. */
	it("strips a bidi override out of the prize rather than storing it", () => {
		const parsed = giveawayStart.parse({ ...valid, prize: "Nitro‮gnitroN" });

		expect(parsed.prize).toBe("NitrognitroN");
	});

	/** Markup is refused rather than stripped, because Discord re-renders the prize and a sanitiser eats mentions. */
	it("refuses a prize carrying markup", () => {
		expect(giveawayStart.safeParse({ ...valid, prize: "<b>Nitro</b>" }).success).toBe(false);
	});
});

describe("giveawayProblem", () => {
	const draft = { channelId, prize: "A copy of the game", winnerCount: 1, durationMs: 3_600_000 };

	it("passes a draft the API would accept", () => {
		expect(problemText(giveawayProblem(draft))).toBeNull();
	});

	it("names the missing channel before anything else", () => {
		expect(problemText(giveawayProblem({ ...draft, channelId: null }))).toMatch(/channel/i);
	});

	it("refuses what the schema refuses", () => {
		expect(problemText(giveawayProblem({ ...draft, prize: "  " }))).toMatch(/what is being given away/i);
		expect(problemText(giveawayProblem({ ...draft, winnerCount: 0 }))).toMatch(/at least one winner/i);
		expect(problemText(giveawayProblem({ ...draft, winnerCount: GIVEAWAY_LIMITS.maxWinners + 1 }))).toMatch(
			/more than/i,
		);
		expect(problemText(giveawayProblem({ ...draft, durationMs: 1_000 }))).toMatch(/at least a minute/i);
		expect(problemText(giveawayProblem({ ...draft, durationMs: GIVEAWAY_LIMITS.maxDurationMs + 1 }))).toMatch(
			/30 days/i,
		);
	});
});
