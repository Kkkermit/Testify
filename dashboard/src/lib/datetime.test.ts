import { clockTime, dateAndTime, shortDate, since } from "@/lib/datetime";

const AT = "2026-07-30T18:04:09.000Z";

describe("shortDate", () => {
	/** `7/30/2026` and `30/07/2026` are unreadable as each other, so the month is never a number. */
	it("names the month rather than numbering it", () => {
		expect(shortDate(AT)).toBe("30 Jul 2026");
	});

	it("hands back anything it cannot parse", () => {
		expect(shortDate("nonsense")).toBe("nonsense");
	});
});

describe("dateAndTime", () => {
	it("adds a 24-hour clock without seconds", () => {
		expect(dateAndTime(AT)).toMatch(/^30 Jul 2026, \d{2}:\d{2}$/);
	});
});

describe("clockTime", () => {
	it("keeps seconds, because a log line is read against another log line", () => {
		expect(clockTime(AT)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
	});
});

describe("since", () => {
	const now = new Date(AT).getTime();

	it("reads as elapsed time while that is the useful fact", () => {
		expect(since(new Date(now - 30_000).toISOString(), now)).toBe("just now");
		expect(since(new Date(now - 60_000).toISOString(), now)).toBe("1 minute ago");
		expect(since(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5 minutes ago");
		expect(since(new Date(now - 3_600_000).toISOString(), now)).toBe("1 hour ago");
		expect(since(new Date(now - 3 * 86_400_000).toISOString(), now)).toBe("3 days ago");
	});

	/** A year-old record reading "53 weeks ago" is arithmetic, not information. */
	it("falls back to the date once elapsed time stops meaning anything", () => {
		expect(since("2025-01-05T00:00:00.000Z", now)).toBe("5 Jan 2025");
	});

	/** A clock skewed a few seconds ahead must not produce "-1 minutes ago". */
	it("shows a stamp in the future as a date rather than negative time", () => {
		expect(since(new Date(now + 90_000).toISOString(), now)).toMatch(/^30 Jul 2026,/);
	});

	it("hands back anything it cannot parse", () => {
		expect(since("nonsense", now)).toBe("nonsense");
	});
});
