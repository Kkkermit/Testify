import { type GiveawayRow } from "@testify/shared";
import { canReroll, durationMsOf, ordered, statusOf } from "@/features/giveaways/giveaways.utils";

function row(overrides: Partial<GiveawayRow> = {}): GiveawayRow {
	return {
		messageId: "700000000000000001",
		channelId: "400000000000000001",
		prize: "A copy of the game",
		winnerCount: 1,
		startAt: "2026-08-01T10:00:00.000Z",
		endAt: "2026-08-02T10:00:00.000Z",
		ended: false,
		winners: [],
		hostedBy: "100000000000000001",
		...overrides,
	};
}

describe("durationMsOf", () => {
	/** A half-hour typed as 0.5 hours has to land on a whole millisecond, not a fraction the API would refuse. */
	it("rounds to a whole millisecond", () => {
		expect(Number.isInteger(durationMsOf(0.5, "hours"))).toBe(true);
	});
});

describe("ordered", () => {
	/** A finished giveaway is not what somebody opening the screen came to act on. */
	it("puts running giveaways above finished ones", () => {
		const rows = [
			row({ messageId: "old-ended", ended: true, startAt: "2026-08-05T10:00:00.000Z" }),
			row({ messageId: "running", ended: false, startAt: "2026-08-01T10:00:00.000Z" }),
		];

		expect(ordered(rows).map((entry) => entry.messageId)).toEqual(["running", "old-ended"]);
	});
});

describe("statusOf and runningCount", () => {
	it("reads the status off the record", () => {
		expect(statusOf(row())).toBe("running");
		expect(statusOf(row({ ended: true }))).toBe("ended");
	});
});

describe("canReroll", () => {
	/** Rerolling a giveaway nobody entered would redraw from an empty pool, so the button must not be offered. */
	it("is offered only once it has drawn somebody", () => {
		expect(canReroll(row({ ended: false }))).toBe(false);
		expect(canReroll(row({ ended: true, winners: [] }))).toBe(false);
		expect(canReroll(row({ ended: true, winners: [{ id: "100000000000000002", tag: "winner#0001" }] }))).toBe(true);
	});
});
