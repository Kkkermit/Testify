import { liveNotices, NOTICE_LIMITS, noticeTimingBlocked } from "@testify/shared";

const NOW = new Date("2026-10-31T12:00:00.000Z");
const DAY_MINUTES = 24 * 60;
const at = (minutes: number): Date => new Date(NOW.getTime() + minutes * 60_000);

describe("noticeTimingBlocked", () => {
	it("allows what the forms offer, and names every time it cannot keep", () => {
		const cases: [string, Parameters<typeof noticeTimingBlocked>[0], string | null][] = [
			["posted now, up until removed", { startsAt: NOW, endsAt: null, rescheduled: false }, null],
			["posted now for a day", { startsAt: NOW, endsAt: at(DAY_MINUTES), rescheduled: false }, null],
			["scheduled an hour ahead", { startsAt: at(60), endsAt: at(120), rescheduled: true }, null],
			["scheduled in the past", { startsAt: at(-5), endsAt: null, rescheduled: true }, "notice.startPast"],
			["scheduled under a minute ahead", { startsAt: at(0.5), endsAt: null, rescheduled: true }, "notice.startPast"],
			[
				"scheduled past the limit",
				{ startsAt: at(NOTICE_LIMITS.maxAheadDays * DAY_MINUTES + 1), endsAt: null, rescheduled: true },
				"notice.startTooFar",
			],
			["ending before it goes up", { startsAt: at(60), endsAt: at(30), rescheduled: true }, "notice.endBeforeStart"],
			["ending in the past", { startsAt: at(-60), endsAt: at(-1), rescheduled: false }, "notice.endBeforeStart"],
			[
				"staying up too long",
				{ startsAt: NOW, endsAt: at(NOTICE_LIMITS.maxUpDays * DAY_MINUTES + 1), rescheduled: false },
				"notice.endTooLong",
			],
			// One already up keeps its past start when only its end moves.
			[
				"only the end moving on one already up",
				{ startsAt: at(-DAY_MINUTES), endsAt: at(60), rescheduled: false },
				null,
			],
		];

		const wrong = cases
			.filter(([, timing, code]) => (noticeTimingBlocked(timing, NOW)?.code ?? null) !== code)
			.map(([name]) => name);
		expect(wrong).toEqual([]);
	});
});

describe("liveNotices", () => {
	/** Readers never see one still waiting to go up, nor one whose end has passed before the TTL has swept it. */
	it("keeps only what is up right now", () => {
		const iso = (minutes: number): string => at(minutes).toISOString();
		const notices = [
			{ name: "up", publishedAt: iso(-60), endsAt: null },
			{ name: "waiting", publishedAt: iso(60), endsAt: null },
			{ name: "ended", publishedAt: iso(-60), endsAt: iso(-1) },
			{ name: "ending later", publishedAt: iso(-60), endsAt: iso(60) },
		];

		expect(liveNotices(notices, NOW).map((notice) => notice.name)).toEqual(["up", "ending later"]);
	});
});
