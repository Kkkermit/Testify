import { type LotterySettings } from "@testify/shared";
import { draftOf, draftProblem, isDirty, reschedules, winnersWarning } from "@/features/lottery/lottery.utils";

const SETTINGS: LotterySettings = {
	enabled: true,
	frozen: false,
	entryFee: 100,
	basePrizePool: 500,
	maxWinners: 2,
	frequency: "weekly",
	announcementChannelId: "400000000000000001",
	prizePool: 2500,
	ticketsSold: 20,
	entrants: 7,
	nextDrawAt: "2026-08-14T12:00:00.000Z",
	history: [],
};

describe("draftProblem", () => {
	const draft = draftOf(SETTINGS);

	it("says nothing about a complete draft", () => {
		expect(draftProblem(draft)).toBeNull();
	});

	it("asks for the announcement channel", () => {
		expect(draftProblem({ ...draft, announcementChannelId: null })).toMatch(/announced/i);
	});

	it("refuses a free ticket", () => {
		expect(draftProblem({ ...draft, entryFee: 0 })).toMatch(/at least/i);
	});

	it("refuses more winners than a draw can pay", () => {
		expect(draftProblem({ ...draft, maxWinners: 99 })).toMatch(/winners/i);
	});

	/** An emptied number input reads as NaN, which is not a bound failure and must not save. */
	it("refuses a field that has been emptied", () => {
		expect(draftProblem({ ...draft, basePrizePool: Number.NaN })).not.toBeNull();
		expect(draftProblem({ ...draft, maxWinners: Number.NaN })).not.toBeNull();
	});
});

describe("isDirty", () => {
	it("is false for an untouched draft", () => {
		expect(isDirty(draftOf(SETTINGS), SETTINGS)).toBe(false);
	});

	it("notices a change to any field", () => {
		expect(isDirty({ ...draftOf(SETTINGS), entryFee: 150 }, SETTINGS)).toBe(true);
		expect(isDirty({ ...draftOf(SETTINGS), frequency: "daily" }, SETTINGS)).toBe(true);
	});
});

describe("reschedules", () => {
	/** Changing the frequency moves the next draw, and an admin should know that before pressing Save. */
	it("is true only when the frequency changes", () => {
		expect(reschedules(draftOf(SETTINGS), SETTINGS)).toBe(false);
		expect(reschedules({ ...draftOf(SETTINGS), frequency: "daily" }, SETTINGS)).toBe(true);
		expect(reschedules({ ...draftOf(SETTINGS), entryFee: 900 }, SETTINGS)).toBe(false);
	});
});

describe("winnersWarning", () => {
	it("says nothing when there are more tickets than winners", () => {
		expect(winnersWarning(draftOf(SETTINGS), SETTINGS)).toBeNull();
	});

	/** A draw for more winners than tickets sold leaves somebody with nothing, which reads as a broken draw. */
	it("warns when the winners outnumber the tickets sold", () => {
		expect(winnersWarning({ ...draftOf(SETTINGS), maxWinners: 5 }, { ...SETTINGS, ticketsSold: 3 })).toMatch(
			/empty-handed/i,
		);
	});

	it("says nothing before any tickets are sold, when the comparison means nothing", () => {
		expect(winnersWarning({ ...draftOf(SETTINGS), maxWinners: 5 }, { ...SETTINGS, ticketsSold: 0 })).toBeNull();
	});
});
