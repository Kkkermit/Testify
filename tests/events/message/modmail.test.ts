import { openConversationOf, type StoredConversation } from "@database/repositories/modmailRepository";
import { logDirectMessage } from "@database/repositories/profileRepository";
import directMessageLog from "@events/message/directMessageLog.event";
import modmailDirect from "@events/message/modmailDirect.event";
import { offerModmail, relayFromMember } from "@lib/modmail";
import { createMockClient, createMockMessage } from "@tests/helpers/mocks";

jest.mock("@database/repositories/modmailRepository", () => ({
	openConversationOf: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/profileRepository", () => ({ logDirectMessage: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/modmail", () => ({
	offerModmail: jest.fn(() => Promise.resolve(false)),
	relayFromMember: jest.fn(() => Promise.resolve()),
}));

const open = { id: "c".repeat(24), guildId: "900000000000000001" } as StoredConversation;

function directMessage() {
	return createMockMessage({ content: "hello", overrides: { guild: null } });
}

describe("mod mail in direct messages", () => {
	/** Somebody writing to a server's staff has not written to the bot's operator, so it is not forwarded to them. */
	it("keeps a message in an open conversation out of the operator's DM log", async () => {
		jest.mocked(openConversationOf).mockResolvedValue(open);
		const client = createMockClient({ env: { CHANNEL_DM_LOG: "400000000000000009" } } as never);

		await directMessageLog.run(directMessage(), client);

		expect(logDirectMessage).not.toHaveBeenCalled();
	});

	it("relays a message to the open conversation and stops there, or offers the servers when none is open", async () => {
		jest.mocked(openConversationOf).mockResolvedValueOnce(open).mockResolvedValueOnce(null);
		const client = createMockClient();

		expect(await modmailDirect.run(directMessage(), client)).toBe(true);
		expect(relayFromMember).toHaveBeenCalled();

		expect(await modmailDirect.run(directMessage(), client)).toBeUndefined();
		expect(offerModmail).toHaveBeenCalled();
	});
});
