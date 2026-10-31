import { Collection, MessageFlags } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { listNotices, markNoticeHinted, readerState } from "@database/repositories/noticeRepository";
import interactionCreate from "@events/command/interactionCreate.event";
import prefixCommands from "@events/message/prefixCommands.event";
import { type Notice } from "@testify/shared";
import { createMockClient, createMockInteraction, createMockMessage } from "@tests/helpers/mocks";

jest.mock("@core/checks", () => ({ runChecks: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@lib/bot", () => ({ countCommandUse: jest.fn(), logCommandUse: jest.fn(), recordCommandTime: jest.fn() }));
jest.mock("@database/repositories/prefixRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve({ prefix: "t?", isEnabled: true })),
}));
jest.mock("@database/repositories/noticeRepository", () => ({
	listNotices: jest.fn(),
	markNoticeHinted: jest.fn(() => Promise.resolve()),
	readerState: jest.fn(() => Promise.resolve({ seenAt: null, hintedAt: null })),
}));

const MUSIC: Notice = {
	id: "a".repeat(24),
	title: "Music is down",
	body: "YouTube is refusing the bot.",
	tone: "problem",
	publishedAt: "2026-10-31T10:00:00.000Z",
	updatedAt: "2026-10-31T10:00:00.000Z",
};

const PING: Command = { name: "ping", description: "Pings.", category: "info", run: () => Promise.resolve() };

function slash(overrides: Record<string, unknown> = {}): ReturnType<typeof createMockInteraction> {
	return createMockInteraction({
		overrides: { commandName: "ping", isAutocomplete: (() => false) as never, ...overrides },
	});
}

function client(): TestifyClient {
	return createMockClient({ commands: new Collection([["ping", PING]]) });
}

/** The hint is not awaited by the command, so the test waits for it as the event loop would. */
const settled = (): Promise<void> =>
	new Promise((resolve) => {
		setImmediate(resolve);
	});

beforeEach(() => {
	jest.mocked(listNotices).mockResolvedValue([MUSIC]);
});

describe("any command run, after a notification is posted", () => {
	it("tells somebody who ran a slash command, privately, which command reads it", async () => {
		const interaction = slash();

		await interactionCreate.run(client(), interaction);
		await settled();

		expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
		expect(JSON.stringify(interaction.sent)).toContain("There is 1 new notification");
		expect(JSON.stringify(interaction.sent)).toContain("/bot-notifications");
		expect(markNoticeHinted).toHaveBeenCalledWith(interaction.user.id, new Date(MUSIC.publishedAt));
	});

	it("tells somebody who ran a prefix command with their server's prefix, in a reply that tidies away", async () => {
		const message = createMockMessage({ content: "t?ping" });
		const bot = client();

		await prefixCommands.run(message, bot);
		await settled();

		expect(JSON.stringify(message.sent)).toContain("t?bot-notifications");
		expect(bot.timers.after).toHaveBeenCalledWith(
			expect.stringMatching(/^tidy:/),
			expect.any(Number),
			expect.any(Function),
		);
	});

	/** Once per notification, not once per command: the second command must not be interrupted again. */
	it("says it once, however many commands follow", async () => {
		const bot = client();
		const first = slash();
		const second = slash({ user: first.user });

		await interactionCreate.run(bot, first);
		await settled();
		await interactionCreate.run(bot, second);
		await settled();

		expect(first.followUp).toHaveBeenCalledTimes(1);
		expect(second.followUp).not.toHaveBeenCalled();
		expect(readerState).toHaveBeenCalledTimes(1);
	});

	it("says nothing to somebody who has already read it", async () => {
		jest.mocked(readerState).mockResolvedValue({ seenAt: new Date("2026-10-31T11:00:00.000Z"), hintedAt: null });
		const interaction = slash();

		await interactionCreate.run(client(), interaction);
		await settled();

		expect(interaction.followUp).not.toHaveBeenCalled();
	});
});
