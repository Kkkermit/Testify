import { AUTO_RESPONDER } from "@config/constants";
import { nextMatch } from "@lib/autoResponders/autoResponderActions.util";
import { responderFor, responderMatches, shouldAnswer } from "@lib/autoResponders/autoResponders.util";
import { type AutoResponder, autoResponderBlocked, triggerKey } from "@testify/shared";

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

	it("finds a phrase anywhere, whatever the case and spacing", () => {
		expect(responderMatches("So   HOW do I get Roles here?", responder("how do i get roles"))).toBe(true);
	});

	it("keeps looking past an occurrence inside another word", () => {
		expect(responderMatches("thinking about hi", responder("hi"))).toBe(true);
	});

	it("treats letters beyond English as part of a word", () => {
		expect(responderMatches("café ouvert", responder("caf"))).toBe(false);
		expect(responderMatches("привет всем", responder("привет"))).toBe(true);
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

describe("responderFor", () => {
	it("answers with the first that matches, once", () => {
		const first = responder("roles", "word", "1");
		const second = responder("get roles", "word", "2");

		expect(responderFor("how do i get roles", [first, second])).toBe(first);
		expect(responderFor("nothing here", [first, second])).toBeNull();
	});
});

describe("shouldAnswer", () => {
	it("answers once a channel, and again once the pause is over", () => {
		const now = 1_000_000;

		expect(shouldAnswer("g1", "c1", "r1", now)).toBe(true);
		expect(shouldAnswer("g1", "c1", "r1", now + 1)).toBe(false);
		expect(shouldAnswer("g1", "c2", "r1", now + 1)).toBe(true);
		expect(shouldAnswer("g1", "c1", "r1", now + AUTO_RESPONDER.answerEveryMs)).toBe(true);
	});

	/** Keyed by server, so one server's chatter never silences another's. */
	it("keeps servers apart", () => {
		const now = 2_000_000;

		expect(shouldAnswer("g1", "c1", "r9", now)).toBe(true);
		expect(shouldAnswer("g2", "c1", "r9", now)).toBe(true);
	});
});

describe("triggerKey and autoResponderBlocked", () => {
	it("reads two spellings of the same words as one", () => {
		expect(triggerKey("  How  Do I ")).toBe(triggerKey("how do i"));
	});

	it("names what is missing, then a repeat", () => {
		expect(autoResponderBlocked({ trigger: " ", reply: "x" }, [])?.code).toBe("autoResponder.trigger");
		expect(autoResponderBlocked({ trigger: "hi", reply: " " }, [])?.code).toBe("autoResponder.reply");
		expect(autoResponderBlocked({ trigger: "HI", reply: "x" }, [responder("hi")])?.code).toBe(
			"autoResponder.duplicate",
		);
		expect(autoResponderBlocked({ trigger: "hello", reply: "x" }, [responder("hi")])).toBeNull();
	});
});

describe("nextMatch", () => {
	it("walks through all three and back", () => {
		expect([nextMatch("word"), nextMatch("exact"), nextMatch("starts")]).toEqual(["exact", "starts", "word"]);
	});
});
