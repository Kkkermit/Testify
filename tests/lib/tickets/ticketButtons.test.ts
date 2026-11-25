import { ChannelType } from "discord.js";
import ticket from "@buttons/ticket";
import { UserFacingError } from "@core/errors";
import { toggleTicketMember } from "@lib/tickets";
import { createMockGuild, createMockMember, mockCollection, USER_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/ticketRepository", () => ({
	getTicketSetup: jest.fn(() => Promise.resolve({ handlerRoleId: "600000000000000099" })),
	getTicketByChannel: jest.fn(() => Promise.resolve({ ownerId: USER_ID })),
}));
jest.mock("@lib/tickets", () => ({
	...jest.requireActual<object>("@lib/tickets"),
	toggleTicketMember: jest.fn(() => Promise.resolve("added")),
}));

/** The member picker is staff's; a ticket's owner, or somebody whose staff role was taken, must not add people. */
it("asks for the staff role when a member is picked, not only when the picker opened", async () => {
	const owner = createMockMember({ roles: { cache: mockCollection() } } as never);
	const guild = createMockGuild({ members: { fetch: jest.fn(() => Promise.resolve(owner)) } } as never);
	const picked = {
		guild,
		user: { id: USER_ID },
		channelId: "500000000000000005",
		channel: { type: ChannelType.GuildText },
		values: ["300000000000000003"],
		isStringSelectMenu: () => true,
		update: jest.fn(),
	};

	await expect(
		ticket.run(picked as never, { client: {} as never, action: "toggle-member", args: [] }),
	).rejects.toBeInstanceOf(UserFacingError);
	expect(toggleTicketMember).not.toHaveBeenCalled();
});
