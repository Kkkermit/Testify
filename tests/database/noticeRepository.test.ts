import { NoticeReader } from "@database/models/notice.schema";
import {
	createNotice,
	deleteNotice,
	findNotice,
	listNotices,
	markNoticeHinted,
	markNoticesSeen,
	readerState,
	updateNotice,
} from "@database/repositories/noticeRepository";
import { NOTICE_LIMITS, type NoticeInput } from "@testify/shared";
import { describeWithMongo } from "@tests/helpers/mongo";

const OWNER = "100000000000000001";
const READER = "100000000000000002";
const MUSIC_DOWN: NoticeInput = { title: "Music is down", body: "YouTube is refusing the bot.", tone: "problem" };

describeWithMongo("the notice repository", () => {
	it("lists the newest first, and forgets its cached list on every write", async () => {
		await createNotice(MUSIC_DOWN, OWNER);
		expect((await listNotices()).map((notice) => notice.title)).toEqual(["Music is down"]);

		await new Promise((resolve) => setTimeout(resolve, 5));
		await createNotice({ ...MUSIC_DOWN, title: "Music is back", tone: "fixed" }, OWNER);

		expect((await listNotices()).map((notice) => notice.title)).toEqual(["Music is back", "Music is down"]);
	});

	/** Every one is drawn whole on one Discord panel, so a sixth would push it past Discord's text limit. */
	it("refuses a notification past the cap", async () => {
		for (let index = 0; index < NOTICE_LIMITS.maxActive; index += 1) {
			expect(await createNotice({ ...MUSIC_DOWN, title: `Notice ${String(index)}` }, OWNER)).not.toBeNull();
		}

		expect(await createNotice(MUSIC_DOWN, OWNER)).toBeNull();
	});

	/** Fixing a typo must not tell everybody again; asking to is a separate, deliberate choice. */
	it("keeps when it was published through an edit, unless everybody is to be told again", async () => {
		const posted = await createNotice(MUSIC_DOWN, OWNER);
		if (posted === null) throw new Error("not posted");

		await new Promise((resolve) => setTimeout(resolve, 5));
		const edited = await updateNotice(posted.id, { body: "SoundCloud still plays." });
		expect(edited).toMatchObject({ body: "SoundCloud still plays.", publishedAt: posted.publishedAt });

		const again = await updateNotice(posted.id, { notifyAgain: true });
		expect(again?.publishedAt).not.toBe(posted.publishedAt);
	});

	it("answers a missing or malformed id with nothing rather than an error", async () => {
		expect(await findNotice("not-an-id")).toBeNull();
		expect(await updateNotice("a".repeat(24), { title: "x" })).toBeNull();
		expect(await deleteNotice("a".repeat(24))).toBe(false);
	});

	it("removes a notification", async () => {
		const posted = await createNotice(MUSIC_DOWN, OWNER);
		expect(await deleteNotice(posted?.id ?? "")).toBe(true);
		expect(await listNotices()).toEqual([]);
	});

	/** `$max`, so a hint written late cannot move a reader's times back behind a newer one. */
	it("keeps the later of two times, and expires a reader who stops reading", async () => {
		expect(await readerState(READER)).toEqual({ seenAt: null, hintedAt: null });

		const later = new Date("2030-10-31T12:00:00.000Z");
		await markNoticesSeen(READER, later);
		await markNoticeHinted(READER, new Date("2030-10-30T12:00:00.000Z"));

		expect(await readerState(READER)).toEqual({ seenAt: later, hintedAt: later });
		const row = await NoticeReader.findOne({ userId: READER }).lean().exec();
		expect(row?.expiresAt.getTime()).toBe(later.getTime() + NOTICE_LIMITS.readerDays * 24 * 60 * 60 * 1000);
	});
});
