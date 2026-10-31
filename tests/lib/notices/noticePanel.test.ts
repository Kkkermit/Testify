import { parseCustomId } from "@core/button";
import { nextTone, noticeBoard, noticeEditor, noticeHint } from "@lib/notices/noticePanel.util";
import { type Notice, NOTICE_LIMITS, NOTICE_TONES, type NoticeTone } from "@testify/shared";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

function notice(index: number, overrides: Partial<Notice> = {}): Notice {
	return {
		id: String(index).padStart(24, "a"),
		title: `Notice ${String(index)}`,
		body: "Music is down for now.",
		tone: "problem",
		publishedAt: "2026-10-31T10:00:00.000Z",
		endsAt: null,
		updatedAt: "2026-10-31T10:00:00.000Z",
		...overrides,
	};
}

describe("noticeBoard", () => {
	/** Anybody else sees the same words with nothing to press, since every control here speaks for the bot. */
	it("gives everybody but an owner no controls at all", () => {
		const board = noticeBoard([notice(1)], null);

		expect(idsOf(board)).toEqual([]);
		expect(textOf(board)).toContain("Music is down for now.");
	});

	it("gives an owner a picker and a post button per kind, each carrying their id last", () => {
		const ids = idsOf(noticeBoard([notice(1)], OWNER));

		expect(ids.map((id) => parseCustomId(id).action).sort()).toEqual(["new", "new", "new", "open"]);
		for (const id of ids) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	it("stops an owner posting past the cap", () => {
		const full = Array.from({ length: NOTICE_LIMITS.maxActive }, (_, index) => notice(index));

		expect(buttonsOf(noticeBoard(full, OWNER)).every((entry) => entry["disabled"] === true)).toBe(true);
	});

	/** Discord refuses a Components V2 message whose text runs past 4,000 characters, and the panel shows every one whole. */
	it("stays inside Discord's text limit with every notification at its longest", () => {
		const longest = Array.from({ length: NOTICE_LIMITS.maxActive }, (_, index) =>
			notice(index, {
				title: "T".repeat(NOTICE_LIMITS.maxTitle),
				body: "B".repeat(NOTICE_LIMITS.maxBody),
				updatedAt: "2026-10-31T12:00:00.000Z",
				endsAt: "2026-11-30T12:00:00.000Z",
			}),
		);

		expect(textOf(noticeBoard(longest, OWNER)).length).toBeLessThanOrEqual(4_000);
	});

	/** An owner's words may mention anybody, and the panel must not ping them for it. */
	it("pings nobody whatever the text says", () => {
		expect(noticeBoard([notice(1, { body: "@everyone <@&300000000000000001>" })], null).allowedMentions).toEqual({
			parse: [],
		});
	});

	it("says an edit only when it came well after the post", () => {
		expect(textOf(noticeBoard([notice(1)], null))).not.toContain("edited");
		expect(textOf(noticeBoard([notice(1, { updatedAt: "2026-10-31T11:00:00.000Z" })], null))).toContain("edited");
	});
});

describe("noticeEditor", () => {
	/** One press asks; only the second removes. */
	it("asks before removing", () => {
		const actions = (confirmingRemove: boolean) =>
			idsOf(noticeEditor({ notice: notice(1), confirmingRemove }, OWNER)).map((id) => parseCustomId(id).action);

		expect(actions(false)).not.toContain("remove-yes");
		expect(actions(true)).toEqual(expect.arrayContaining(["remove-yes", "remove-no"]));
	});
});

describe("nextTone", () => {
	it("walks every kind and comes back round", () => {
		let tone: NoticeTone = NOTICE_TONES[0];
		const seen = new Set<string>();
		for (const _ of NOTICE_TONES) {
			seen.add(tone);
			tone = nextTone(tone);
		}

		expect(seen.size).toBe(NOTICE_TONES.length);
		expect(tone).toBe(NOTICE_TONES[0]);
	});
});

describe("noticeHint", () => {
	it("counts what is new and names the command that reads it", () => {
		expect(noticeHint(1, "/bot-notifications").data.description).toMatch(
			/is 1 new notification .* `\/bot-notifications` to read it\./,
		);
		expect(noticeHint(3, "t?bot-notifications").data.description).toMatch(/are 3 new notifications .* read them\./);
	});
});

describe("a notification with a time", () => {
	const NOW = new Date("2026-10-31T12:00:00.000Z");
	const waiting = notice(1, { publishedAt: "2026-11-01T09:00:00.000Z", endsAt: "2026-11-02T09:00:00.000Z" });
	const actionsOf = (panel: ReturnType<typeof noticeEditor>): string[] =>
		idsOf(panel).map((id) => parseCustomId(id).action);

	it("says when one goes up and comes down", () => {
		const text = textOf(noticeBoard([waiting, notice(2)], OWNER, undefined, NOW));

		expect(text).toContain("⏳ goes up <t:1793523600:R> · comes down <t:1793610000:R>");
		expect(text).toContain("posted <t:1793440800:R>");
	});

	/** Tell everybody again on one that is not up yet would mean nothing, so it is offered as Post now instead. */
	it("lets one still waiting be moved or posted now, and one already up only have its end changed", () => {
		const waitingEditor = noticeEditor({ notice: waiting }, OWNER, NOW);
		const liveEditor = noticeEditor({ notice: notice(2) }, OWNER, NOW);

		expect(actionsOf(waitingEditor)).toEqual(expect.arrayContaining(["start", "end", "again"]));
		expect(buttonsOf(waitingEditor).map((entry) => entry["label"])).toContain("Post now");
		expect(actionsOf(liveEditor)).toContain("end");
		expect(actionsOf(liveEditor)).not.toContain("start");
		expect(textOf(liveEditor)).toContain("When it is removed");
	});
});
