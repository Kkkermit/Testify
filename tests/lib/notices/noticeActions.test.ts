import { UserFacingError } from "@core/errors";
import {
	createNotice,
	listNotices,
	markNoticeHinted,
	markNoticesSeen,
	readerState,
} from "@database/repositories/noticeRepository";
import { mentionNewNotices, postNotice, readNoticeFeed } from "@lib/notices/noticeActions.util";
import { type Notice } from "@testify/shared";

jest.mock("@database/repositories/noticeRepository", () => ({
	createNotice: jest.fn(),
	deleteNotice: jest.fn(),
	findNotice: jest.fn(),
	listNotices: jest.fn(),
	markNoticeHinted: jest.fn(() => Promise.resolve()),
	markNoticesSeen: jest.fn(() => Promise.resolve()),
	readerState: jest.fn(),
	updateNotice: jest.fn(),
}));

const USER = "100000000000000002";

function notice(id: string, publishedAt: string): Notice {
	return { id, title: `Notice ${id}`, body: "Body", tone: "info", publishedAt, updatedAt: publishedAt };
}

const OLDER = notice("a", "2026-10-30T10:00:00.000Z");
const NEWER = notice("b", "2026-10-31T10:00:00.000Z");

function reader(seenAt: string | null, hintedAt: string | null = null): void {
	jest.mocked(readerState).mockResolvedValue({
		seenAt: seenAt === null ? null : new Date(seenAt),
		hintedAt: hintedAt === null ? null : new Date(hintedAt),
	});
}

beforeEach(() => {
	jest.mocked(listNotices).mockResolvedValue([NEWER, OLDER]);
	jest.mocked(markNoticeHinted).mockResolvedValue();
	jest.mocked(markNoticesSeen).mockResolvedValue();
	reader(null);
});

describe("readNoticeFeed", () => {
	it("counts what was published since the reader last looked", async () => {
		reader("2026-10-31T00:00:00.000Z");

		expect(await readNoticeFeed(USER)).toEqual({ notices: [NEWER, OLDER], unread: 1 });
		expect(markNoticesSeen).not.toHaveBeenCalled();
	});

	/** Somebody who has never looked has every notification still to read. */
	it("counts every one for somebody who has never looked, and none once they have read them", async () => {
		expect((await readNoticeFeed(USER)).unread).toBe(2);
		expect(await readNoticeFeed(USER, { markRead: true })).toEqual({ notices: [NEWER, OLDER], unread: 0 });
		expect(markNoticesSeen).toHaveBeenCalledWith(USER);
	});
});

describe("mentionNewNotices", () => {
	/** Said after every command, a hint the reader has already seen would be noise on each one. */
	it("mentions each new notification once, whatever the reader runs next", async () => {
		const tell = jest.fn(() => Promise.resolve());

		await mentionNewNotices(USER, tell);
		await mentionNewNotices(USER, tell);

		expect(tell).toHaveBeenCalledTimes(1);
		expect(tell).toHaveBeenCalledWith(2);
		expect(markNoticeHinted).toHaveBeenCalledWith(USER, new Date(NEWER.publishedAt));
		// The second command is answered from memory, so it costs no read of the reader's record.
		expect(readerState).toHaveBeenCalledTimes(1);
	});

	it("says nothing to somebody already told, or who has read them", async () => {
		const tell = jest.fn(() => Promise.resolve());

		reader(null, NEWER.publishedAt);
		await mentionNewNotices(USER, tell);
		reader(NEWER.publishedAt);
		await mentionNewNotices("100000000000000003", tell);

		expect(tell).not.toHaveBeenCalled();
	});

	it("mentions it again once a newer one is posted", async () => {
		const tell = jest.fn(() => Promise.resolve());
		jest.mocked(listNotices).mockResolvedValue([OLDER]);
		await mentionNewNotices(USER, tell);

		const newest = notice("c", "2026-11-01T10:00:00.000Z");
		jest.mocked(listNotices).mockResolvedValue([newest, OLDER]);
		reader(null, OLDER.publishedAt);
		await mentionNewNotices(USER, tell);

		expect(tell).toHaveBeenCalledTimes(2);
	});

	/** A command answered with a form cannot be followed up, so the hint waits for the next command. */
	it("tries again on the next command when the hint could not be given", async () => {
		const tell = jest.fn().mockRejectedValueOnce(new Error("Unknown Webhook")).mockResolvedValue(undefined);

		await expect(mentionNewNotices(USER, tell)).rejects.toThrow("Unknown Webhook");
		expect(markNoticeHinted).not.toHaveBeenCalled();

		await mentionNewNotices(USER, tell);
		expect(tell).toHaveBeenCalledTimes(2);
		expect(markNoticeHinted).toHaveBeenCalledTimes(1);
	});

	it("does nothing at all while there are no notifications", async () => {
		jest.mocked(listNotices).mockResolvedValue([]);
		const tell = jest.fn(() => Promise.resolve());

		await mentionNewNotices(USER, tell);

		expect(tell).not.toHaveBeenCalled();
		expect(readerState).not.toHaveBeenCalled();
	});
});

describe("postNotice", () => {
	/** The modal on Discord checks only length, so the same schema as the dashboard's has to run here too. */
	it("refuses what the dashboard would refuse, and says so in words", async () => {
		await expect(postNotice({ title: "​", body: "x", tone: "info" }, USER)).rejects.toThrow(UserFacingError);
		await expect(postNotice({ title: "x", body: "x", tone: "loud" as never }, USER)).rejects.toThrow(UserFacingError);
		expect(createNotice).not.toHaveBeenCalled();
	});

	it("says how many can be up when the cap is reached", async () => {
		jest.mocked(createNotice).mockResolvedValue(null);

		await expect(postNotice({ title: "x", body: "x", tone: "info" }, USER)).rejects.toThrow(/already 5/);
	});
});
