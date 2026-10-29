import { DAY_MS, HOUR_MS, MINUTE_MS } from "@config/constants";
import { postIn } from "@lib/scheduledMessages/scheduledMessageActions.util";
import { nextAfter } from "@lib/scheduledMessages/scheduledMessages.util";
import { SCHEDULE_LIMITS, scheduleBlocked, scheduleTimeBlocked } from "@testify/shared";

const NOW = new Date("2026-10-25T12:00:00.000Z");
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);

describe("nextAfter", () => {
	/** Days missed while the bot was away are skipped, rather than posted in a burst when it comes back. */
	it("lands on the first time after now, keeping the post's own time of day", () => {
		const threeDaysAgo = at(-3 * DAY_MS - HOUR_MS);

		expect(nextAfter(threeDaysAgo, "daily", NOW)).toEqual(at(DAY_MS - HOUR_MS));
	});

	it("never lands on now itself", () => {
		expect(nextAfter(at(-DAY_MS), "daily", NOW)).toEqual(at(DAY_MS));
	});
});

describe("postIn", () => {
	it("refuses what is not a length of time, with an example", () => {
		expect(() => postIn("tomorrow", NOW)).toThrow(/such as `30m`/);
	});
});

describe("the shared schedule rules", () => {
	it("names what is missing before looking at the time", () => {
		expect(scheduleBlocked({ channelId: null, message: "x", nextAt: at(HOUR_MS) }, NOW)?.code).toBe("schedule.channel");
		expect(scheduleBlocked({ channelId: "1", message: " ", nextAt: at(HOUR_MS) }, NOW)?.code).toBe("schedule.message");
		expect(scheduleBlocked({ channelId: "1", message: "x", nextAt: null }, NOW)?.code).toBe("schedule.time");
		expect(scheduleBlocked({ channelId: "1", message: "x", nextAt: at(HOUR_MS) }, NOW)).toBeNull();
	});

	it("refuses a time already gone, and one too far ahead", () => {
		expect(scheduleTimeBlocked(at(-MINUTE_MS), NOW)?.code).toBe("schedule.past");
		expect(scheduleTimeBlocked(at(30_000), NOW)?.code).toBe("schedule.past");
		expect(scheduleTimeBlocked(at((SCHEDULE_LIMITS.maxAheadDays + 1) * DAY_MS), NOW)).toEqual({
			code: "schedule.tooFar",
			values: { max: SCHEDULE_LIMITS.maxAheadDays },
		});
		expect(scheduleTimeBlocked(new Date("not a date"), NOW)?.code).toBe("schedule.time");
	});
});
