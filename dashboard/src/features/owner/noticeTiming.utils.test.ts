import { type Notice } from "@testify/shared";
import { timingChange, type TimingDraft, timingDraftOf } from "@/features/owner/noticeTiming.utils";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";

const NOW = new Date("2026-10-31T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const iso = (hours: number): string => new Date(NOW.getTime() + hours * HOUR_MS).toISOString();
const local = (hours: number): string => toLocalInput(new Date(NOW.getTime() + hours * HOUR_MS));

function notice(publishedAt: string, endsAt: string | null): Notice {
	return { id: "a".repeat(24), title: "t", body: "b", tone: "info", publishedAt, endsAt, updatedAt: publishedAt };
}

const LIVE = notice(iso(-3), null);
const LIVE_ENDING = notice(iso(-3), iso(5));
const WAITING = notice(iso(4), iso(10));

describe("timingChange", () => {
	it("sends only what changed, counts from when it goes up, and names what it cannot keep", () => {
		// Each row: the draft, the stored notification, what must be sent (null where only the refusal matters) and the refusal.
		const cases: [string, TimingDraft, Notice | null, object | null, string | null][] = [
			[
				"a new one, now, up until removed",
				{ start: "now", localTime: "", upFor: "forever" },
				null,
				{ endsAt: null },
				null,
			],
			[
				"a new one in two hours, for six",
				{ start: "later", localTime: local(2), upFor: 6 },
				null,
				{ startsAt: iso(2), endsAt: iso(8) },
				null,
			],
			[
				"a new one in the past",
				{ start: "later", localTime: local(-1), upFor: "forever" },
				null,
				null,
				"notice.startPast",
			],
			["a new one with no time", { start: "later", localTime: "", upFor: "forever" }, null, null, "notice.startPast"],
			["one already up, left alone", { start: "now", localTime: "", upFor: "keep" }, LIVE_ENDING, {}, null],
			[
				"one already up, kept until removed",
				{ start: "now", localTime: "", upFor: "forever" },
				LIVE_ENDING,
				{ endsAt: null },
				null,
			],
			// One already up counts from now, as Discord does, rather than from when it went up three hours ago.
			["one already up, for one more hour", { start: "now", localTime: "", upFor: 1 }, LIVE, { endsAt: iso(1) }, null],
			[
				"one waiting, moved and kept for a day",
				{ start: "later", localTime: local(6), upFor: 24 },
				WAITING,
				{ startsAt: iso(6), endsAt: iso(30) },
				null,
			],
			[
				"one waiting, moved past its end",
				{ start: "later", localTime: local(12), upFor: "keep" },
				WAITING,
				null,
				"notice.endBeforeStart",
			],
		];

		const wrong = cases.filter(([, draft, current, change, code]) => {
			const result = timingChange(draft, current, NOW);
			const sentWrong = change !== null && JSON.stringify(result.change) !== JSON.stringify(change);
			return sentWrong || (result.problem?.code ?? null) !== code;
		});
		expect(wrong.map(([name]) => name)).toEqual([]);
	});

	/** An end that is already set must not be cleared just because the form was opened and saved. */
	it("starts the form from what is stored, keeping an end that is already set", () => {
		expect(timingDraftOf(LIVE_ENDING, NOW)).toEqual({ start: "now", localTime: "", upFor: "keep" });
		expect(timingDraftOf(WAITING, NOW)).toEqual({ start: "later", localTime: local(4), upFor: "keep" });
		expect(timingDraftOf(null, NOW)).toMatchObject({ start: "now", upFor: "forever" });
	});
});
