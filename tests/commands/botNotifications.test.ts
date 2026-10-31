import botNotifications from "@commands/info/botNotifications.command";
import { type TestifyClient } from "@core/client";
import { type CommandInput } from "@core/command";
import { allNotices, readNoticeFeed } from "@lib/notices/noticeActions.util";
import { NOTICE_COMMAND } from "@lib/notices/notices.constants";
import { idsOf, textOf } from "@tests/helpers/containers";

jest.mock("@lib/notices/noticeActions.util", () => ({
	...jest.requireActual<object>("@lib/notices/noticeActions.util"),
	allNotices: jest.fn(),
	readNoticeFeed: jest.fn(),
}));

const USER = "100000000000000002";

function ran(owner: boolean): { input: CommandInput; reply: jest.Mock; client: TestifyClient } {
	const reply = jest.fn((_options: unknown) => Promise.resolve());
	const input = { user: { id: USER }, deferred: false, replied: false, reply } as unknown as CommandInput;
	return { input, reply, client: { isOwner: () => owner } as unknown as TestifyClient };
}

beforeEach(() => {
	jest.mocked(readNoticeFeed).mockResolvedValue({ notices: [], unread: 0 });
	jest.mocked(allNotices).mockResolvedValue([]);
});

describe("/bot-notifications", () => {
	/** Every hint names this command, so a rename that missed the constant would send people nowhere. */
	it("is the command the hint names", () => {
		expect(botNotifications.name).toBe(NOTICE_COMMAND);
		expect(botNotifications.private).toBe(true);
	});

	it("marks what it shows as read", async () => {
		const { input, client } = ran(false);

		await botNotifications.run?.(input, client);

		expect(readNoticeFeed).toHaveBeenCalledWith(USER, { markRead: true });
	});

	it("draws the controls only for one of the bot's owners", async () => {
		const owner = ran(true);
		const member = ran(false);

		await botNotifications.run?.(owner.input, owner.client);
		await botNotifications.run?.(member.input, member.client);

		expect(idsOf(owner.reply.mock.calls[0]?.[0] as never).length).toBeGreaterThan(0);
		expect(idsOf(member.reply.mock.calls[0]?.[0] as never)).toEqual([]);
	});

	/** One waiting to go up is the owners' to manage, so only they are shown it before it does. */
	it("shows an owner the ones still waiting to go up, and nobody else", async () => {
		const waiting = {
			id: "w".repeat(24),
			title: "Maintenance tonight",
			body: "Back soon.",
			tone: "info" as const,
			publishedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			endsAt: null,
			updatedAt: new Date().toISOString(),
		};
		jest.mocked(allNotices).mockResolvedValue([waiting]);
		const owner = ran(true);
		const member = ran(false);

		await botNotifications.run?.(owner.input, owner.client);
		await botNotifications.run?.(member.input, member.client);

		expect(textOf(owner.reply.mock.calls[0]?.[0] as never)).toContain("Maintenance tonight");
		expect(textOf(member.reply.mock.calls[0]?.[0] as never)).not.toContain("Maintenance tonight");
	});
});
