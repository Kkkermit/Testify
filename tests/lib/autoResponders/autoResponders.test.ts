import { responderMatches, shouldAnswer } from "@lib/autoResponders/autoResponders.util";
import { type AutoResponder } from "@testify/shared";

const responder = (trigger: string, match: AutoResponder["match"] = "word", id = trigger): AutoResponder => ({
	id,
	trigger,
	match,
	reply: `About ${trigger}`,
});

describe("responderMatches", () => {
	/** A bare substring would answer "this" for "hi", which is the complaint that gets a feature turned off. */
	it("matches whole words only", () => {
		expect(responderMatches("hi there", responder("hi"))).toBe(true);
		expect(responderMatches("well, hi!", responder("hi"))).toBe(true);
		expect(responderMatches("this is fine", responder("hi"))).toBe(false);
		expect(responderMatches("hiya", responder("hi"))).toBe(false);
	});

	it("matches the whole message, or its start, when told to", () => {
		expect(responderMatches("Rules", responder("rules", "exact"))).toBe(true);
		expect(responderMatches("rules please", responder("rules", "exact"))).toBe(false);

		expect(responderMatches("rules please", responder("rules", "starts"))).toBe(true);
		expect(responderMatches("rulesets", responder("rules", "starts"))).toBe(false);
		expect(responderMatches("the rules", responder("rules", "starts"))).toBe(false);
	});

	it("never matches an empty trigger", () => {
		expect(responderMatches("anything", responder("   "))).toBe(false);
	});
});

describe("shouldAnswer", () => {
	/** Keyed by server, so one server's chatter never silences another's. */
	it("keeps servers apart", () => {
		const now = 2_000_000;

		expect(shouldAnswer("g1", "c1", "r9", now)).toBe(true);
		expect(shouldAnswer("g2", "c1", "r9", now)).toBe(true);
	});
});
