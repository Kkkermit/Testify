import { type WeekEvent } from "@testify/shared";
import { eventDetail, groupByDay } from "@/features/week/week.utils";
import { weekdayDate } from "@/lib/datetime";
import { t } from "@/test/english";

const lottery = (at: Date): WeekEvent => ({ kind: "lottery", at: at.toISOString(), prizePool: 500 });

describe("groupByDay", () => {
	/** Days are the reader's own, so a late-evening post stays under today rather than moving to tomorrow by UTC. */
	it("puts each event under the reader's own day, headed Today and Tomorrow while those are true", () => {
		const now = new Date(2026, 7, 3, 9, 0);
		const later = new Date(2026, 7, 6, 12, 0);
		const days = groupByDay(
			[lottery(new Date(2026, 7, 3, 23, 30)), lottery(new Date(2026, 7, 4, 8, 0)), lottery(later)],
			t,
			now,
		);

		expect(days.map((day) => day.heading)).toEqual(["Today", "Tomorrow", weekdayDate(later.toISOString())]);
	});
});

describe("eventDetail", () => {
	it("shows only the first line of a scheduled message", () => {
		const event: WeekEvent = {
			kind: "scheduled",
			at: "2026-08-03T10:00:00.000Z",
			id: "s1",
			channelId: "1",
			message: "Movie night!\nBring snacks.",
			repeat: "weekly",
		};

		expect(eventDetail(event, [], t)).toBe("Movie night!");
	});
});
