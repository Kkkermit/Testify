import { type User } from "discord.js";
import { clearAfk, findAway } from "@database/repositories/afkRepository";
import handler from "@events/message/afk.event";
import { createMockClient, createMockMessage, createMockUser, mockCollection } from "@tests/helpers/mocks";

jest.mock("@database/repositories/afkRepository", () => ({
	clearAfk: jest.fn(() => Promise.resolve(null)),
	findAway: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/prefixRepository", () => ({ getPrefix: jest.fn(() => Promise.resolve("t?")) }));

let channel = 0;

function messageFrom(content: string, mentions: User[] = [], repliedUser: User | null = null) {
	channel += 1;
	return createMockMessage({
		content,
		overrides: {
			channelId: `55500000000000${String(channel).padStart(4, "0")}`,
			inGuild: () => true,
			mentions: { users: mockCollection(mentions.map((user) => [user.id, user])), repliedUser },
		} as never,
	});
}

const away = createMockUser({ id: "300000000000000003", username: "sam", bot: false });
const bot = createMockUser({ id: "300000000000000004", username: "bot", bot: true });

describe("the afk message handler", () => {
	it("welcomes back a member who was away, without pinging them", async () => {
		jest.mocked(clearAfk).mockResolvedValueOnce({ userId: "1", note: "", updatedAt: new Date() });
		const message = messageFrom("hello");

		await handler.run(message, createMockClient());

		expect(message.sent[0]).toMatchObject({ allowedMentions: { parse: [], repliedUser: false } });
		expect(JSON.stringify(message.sent[0])).toContain("Welcome back");
	});

	/** The message that sets a note would otherwise be the one that clears it again. */
	it("leaves the note alone on the message that sets it", async () => {
		await handler.run(messageFrom("t?afk lunch"), createMockClient());

		expect(clearAfk).not.toHaveBeenCalled();
	});

	it("tells whoever mentions an away member, once", async () => {
		jest.mocked(findAway).mockResolvedValue([{ userId: away.id, note: "lunch", updatedAt: new Date(0) }]);
		const message = messageFrom("are you there", [away]);

		await handler.run(message, createMockClient());

		expect(findAway).toHaveBeenCalledWith(expect.any(String), [away.id]);
		expect(JSON.stringify(message.sent)).toContain("is away: lunch");
	});

	it("counts a reply to an away member as a mention", async () => {
		jest.mocked(findAway).mockResolvedValue([{ userId: away.id, note: "", updatedAt: new Date(0) }]);
		const message = messageFrom("see above", [], away);

		await handler.run(message, createMockClient());

		expect(findAway).toHaveBeenCalledWith(expect.any(String), [away.id]);
	});

	it("never asks about bots or the person speaking", async () => {
		const message = messageFrom("me and the bot", [bot, createMockUser()]);

		await handler.run(message, createMockClient());

		expect(findAway).not.toHaveBeenCalled();
	});
});

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(clearAfk).mockResolvedValue(null);
	jest.mocked(findAway).mockResolvedValue([]);
});
