import { UserFacingError } from "@core/errors";
import {
	createNotice,
	findNotice,
	listNotices,
	markNoticeHinted,
	markNoticesSeen,
	readerState,
	updateNotice,
} from "@database/repositories/noticeRepository";
import {
	allNotices,
	changeNotice,
	mentionNewNotices,
	postNotice,
	readNoticeFeed,
} from "@lib/notices/noticeActions.util";
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
	return { id, title: `Notice ${id}`, body: "Body", tone: "info", publishedAt, endsAt: null, updatedAt: publishedAt };
}

const OLDER = notice("a", "2026-10-30T10:00:00.000Z");
const NEWER = notice("b", "2026-10-31T10:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const WAITING = notice("w", new Date(Date.now() + HOUR_MS).toISOString());

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

		const newest = notice("c", "2026-10-31T11:00:00.000Z");
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

describe("notifications with a time", () => {
	/** One waiting to go up is the owners' to see, and nobody is told of it until it does. */
	it("shows readers nothing still waiting to go up, and tells nobody about it", async () => {
		jest.mocked(listNotices).mockResolvedValue([WAITING, NEWER]);
		reader(NEWER.publishedAt);
		const tell = jest.fn(() => Promise.resolve());

		expect(await readNoticeFeed(USER)).toEqual({ notices: [NEWER], unread: 0 });
		await mentionNewNotices(USER, tell);
		expect(tell).not.toHaveBeenCalled();
		expect(await allNotices()).toEqual([WAITING, NEWER]);
	});

	/** The list is cached for minutes, so one that ends while it is held must drop out of the owners' list too. */
	it("leaves out of the owners' list one whose end passed while the list was held", async () => {
		const ended = { ...NEWER, id: "e", endsAt: new Date(Date.now() - 1_000).toISOString() };
		jest.mocked(listNotices).mockResolvedValue([WAITING, ended, OLDER]);

		expect(await allNotices()).toEqual([WAITING, OLDER]);
	});

	it("refuses a time that cannot be kept before anything is written", async () => {
		const now = new Date();
		const past = new Date(now.getTime() - HOUR_MS).toISOString();
		const soon = new Date(now.getTime() + HOUR_MS).toISOString();

		await expect(postNotice({ ...NEWER, startsAt: past }, USER, now)).rejects.toThrow(/already gone/);
		await expect(postNotice({ ...NEWER, startsAt: soon, endsAt: past }, USER, now)).rejects.toThrow(/after it goes up/);
		expect(createNotice).not.toHaveBeenCalled();
	});

	/** Moving the start of one already up would take it down until then, which nobody asked for. */
	it("will not move the start of one already up, but will post one that is waiting", async () => {
		const soon = new Date(Date.now() + 2 * HOUR_MS).toISOString();
		jest.mocked(findNotice).mockResolvedValue(NEWER);
		jest.mocked(updateNotice).mockResolvedValue(NEWER);

		await expect(changeNotice(NEWER.id, { startsAt: soon })).rejects.toThrow(/already up/);
		expect(updateNotice).not.toHaveBeenCalled();

		await changeNotice(NEWER.id, { endsAt: soon });
		jest.mocked(findNotice).mockResolvedValue(WAITING);
		await changeNotice(WAITING.id, { startsAt: soon });
		expect(updateNotice).toHaveBeenCalledTimes(2);
	});
});
