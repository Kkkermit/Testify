import { getAntiLink } from "@database/repositories/antiLinkRepository";
import handler from "@events/message/antiLink.event";
import { issueWarning } from "@lib/moderation";
import { createMockClient, createMockMessage } from "@tests/helpers/mocks";

jest.mock("@database/repositories/antiLinkRepository", () => ({ getAntiLink: jest.fn() }));
jest.mock("@lib/moderation", () => ({
	...jest.requireActual<object>("@lib/moderation"),
	issueWarning: jest.fn(() => Promise.resolve()),
}));

function linked(deletes: boolean) {
	return createMockMessage({
		content: "see https://example.com",
		overrides: {
			member: { permissions: { has: () => false } },
			delete: jest.fn(() => (deletes ? Promise.resolve() : Promise.reject(new Error("Missing Permissions")))),
			channel: { isSendable: () => false },
		} as never,
	});
}

beforeEach(() => {
	jest.mocked(getAntiLink).mockResolvedValue({ bypassPermission: "ManageMessages" } as never);
});

describe("the link filter", () => {
	/** A link the bot could not delete is still warned for, but only one it took down counts as a deletion. */
	it("counts a link it deleted, and not one Discord would not let it delete", async () => {
		const track = jest.fn();
		const client = createMockClient({ shardlens: { track } } as never);

		await handler.run(linked(true), client);
		await handler.run(linked(false), client);

		expect(track.mock.calls).toEqual([["link_deleted", {}, { guildId: expect.any(String) as string }]]);
		expect(issueWarning).toHaveBeenCalledTimes(2);
	});
});
