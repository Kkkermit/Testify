import { appealAgainAt, appealBody, appealDecision, cooldownOf } from "@testify/shared";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 6);

describe("appealAgainAt", () => {
	/** The wait counts from the refusal, so a person refused a week ago on a 30-day wait has 23 days left. */
	it("holds the next appeal back until the wait after a refusal is over", () => {
		expect([
			appealAgainAt(new Date(NOW - 7 * DAY), 30, NOW)?.getTime(),
			appealAgainAt(new Date(NOW - 31 * DAY), 30, NOW),
			appealAgainAt(null, 30, NOW),
		]).toEqual([NOW + 23 * DAY, null, null]);
	});
});

describe("the appeal rules", () => {
	/** A refusal with no reason leaves somebody nothing to change before they try again. */
	it("needs a reason to refuse but not to accept, and enough words to read as an appeal", () => {
		expect([
			appealDecision.safeParse({ status: "refused", reason: "" }).success,
			appealDecision.safeParse({ status: "accepted", reason: "" }).success,
			appealBody.safeParse({ text: "let me in" }).success,
		]).toEqual([false, true, false]);
	});

	it("reads an unknown stored wait as the default", () => {
		expect([cooldownOf(14), cooldownOf(15), cooldownOf(undefined)]).toEqual([14, 30, 30]);
	});
});
