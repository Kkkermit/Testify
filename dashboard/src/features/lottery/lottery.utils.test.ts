import { type LotterySettings } from "@testify/shared";
import { draftOf, draftProblem, reschedules, winnersWarning } from "@/features/lottery/lottery.utils";
import { t } from "@/test/english";

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

	it("refuses a free ticket", () => {
		expect(draftProblem({ ...draft, entryFee: 0 }, t)).toMatch(/at least/i);
	});

	it("refuses more winners than a draw can pay", () => {
		expect(draftProblem({ ...draft, maxWinners: 99 }, t)).toMatch(/winners/i);
	});

	/** An emptied number input reads as NaN, which is not a bound failure and must not save. */
	it("refuses a field that has been emptied", () => {
		expect(draftProblem({ ...draft, basePrizePool: Number.NaN }, t)).not.toBeNull();
		expect(draftProblem({ ...draft, maxWinners: Number.NaN }, t)).not.toBeNull();
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
	/** A draw for more winners than tickets sold leaves somebody with nothing, which reads as a broken draw. */
	it("warns when the winners outnumber the tickets sold", () => {
		expect(winnersWarning({ ...draftOf(SETTINGS), maxWinners: 5 }, { ...SETTINGS, ticketsSold: 3 }, t)).toMatch(
			/empty-handed/i,
		);
	});
});
