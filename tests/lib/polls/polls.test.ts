import { POLL_LIMITS } from "@lib/polls/polls.constants";
import { parseAnswers, pollMessage } from "@lib/polls/polls.util";

const request = { question: "Best snack?", answers: "Crisps | Fruit | Cake", hours: null, multiple: null };

describe("parseAnswers", () => {
	it("refuses a poll with fewer than two answers or more than ten", () => {
		expect(() => parseAnswers("Yes")).toThrow("Give 2 to 10 answers");
		expect(() => parseAnswers(Array.from({ length: 11 }, (_, index) => `Answer ${String(index)}`).join("|"))).toThrow(
			"Give 2 to 10 answers",
		);
	});

	/** Discord refuses the whole poll over one long answer, so the answer that is too long is named. */
	it("names the answer that is longer than Discord allows", () => {
		const long = "x".repeat(POLL_LIMITS.maxAnswer + 1);

		expect(() => parseAnswers(`Yes | ${long}`)).toThrow(`"${long}" is longer`);
	});

	it("refuses two answers that differ only in case", () => {
		expect(() => parseAnswers("Yes | yes")).toThrow("Each answer has to be different.");
	});
});

describe("pollMessage", () => {
	it("posts a native poll that runs a day unless told otherwise, with one choice each", () => {
		expect(pollMessage(request)).toEqual({
			poll: {
				question: { text: "Best snack?" },
				answers: [{ text: "Crisps" }, { text: "Fruit" }, { text: "Cake" }],
				duration: POLL_LIMITS.defaultHours,
				allowMultiselect: false,
			},
			allowedMentions: { parse: [] },
		});
	});

	it("refuses an empty or overlong question", () => {
		expect(() => pollMessage({ ...request, question: "   " })).toThrow("Ask a question");
		expect(() => pollMessage({ ...request, question: "x".repeat(POLL_LIMITS.maxQuestion + 1) })).toThrow(
			"Keep the question to 300 characters.",
		);
	});

	it("refuses a length Discord will not keep a poll open for", () => {
		expect(() => pollMessage({ ...request, hours: 0 })).toThrow("from 1 hour to 768 hours");
		expect(() => pollMessage({ ...request, hours: POLL_LIMITS.maxHours + 1 })).toThrow("from 1 hour to 768 hours");
	});
});
