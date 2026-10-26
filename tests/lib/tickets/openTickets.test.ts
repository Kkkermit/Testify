import { ChannelType, Collection, type Guild, type GuildMember, type User } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { getTicketByChannel, getTicketSetup, listOpenTickets } from "@database/repositories/ticketRepository";
import { closeTicketFrom, mayClose, readOpenTickets } from "@lib/tickets/openTickets.util";
import { closeTicket } from "@lib/tickets/ticketFlow.util";

jest.mock("@database/repositories/ticketRepository", () => ({
	getTicketSetup: jest.fn(),
	getTicketByChannel: jest.fn(),
	listOpenTickets: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@lib/tickets/ticketFlow.util", () => ({ closeTicket: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const STAFF = "300000000000000001";
const CHANNEL = "400000000000000001";
const OWNER = "100000000000000002";
const SETUP = { guildId: GUILD, handlerRoleId: STAFF } as never;
const TICKET = {
	guildId: GUILD,
	channelId: CHANNEL,
	ticketId: "abc123",
	ownerId: OWNER,
	claimedById: null,
	isLocked: false,
	createdAt: new Date("2026-10-25T10:00:00.000Z"),
} as never;

const withRoles = (...roleIds: string[]) =>
	({ roles: { cache: new Collection(roleIds.map((id) => [id, { id }])) } }) as unknown as GuildMember;

const send = jest.fn(() => Promise.resolve());
const guild = {
	id: GUILD,
	members: { cache: new Collection([[OWNER, { displayName: "Kate" }]]) },
	channels: {
		cache: new Collection([[CHANNEL, { id: CHANNEL, name: "ticket-abc123", type: ChannelType.GuildText, send }]]),
	},
} as unknown as Guild;
const client = { users: { fetch: jest.fn(() => Promise.resolve({ username: "gone" })) } } as unknown as TestifyClient;
const closer = { id: "100000000000000001", username: "mod" } as User;

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getTicketSetup).mockResolvedValue(SETUP);
	jest.mocked(getTicketByChannel).mockResolvedValue(TICKET);
	jest.mocked(listOpenTickets).mockResolvedValue([TICKET]);
});

describe("mayClose", () => {
	/** Inside Discord the Close button asks somebody else's ticket for the staff role, and the web asks the same. */
	it("asks for the ticket staff role, except of a bot owner", () => {
		expect(mayClose(withRoles(STAFF), STAFF)).toBe(true);
		expect(mayClose(withRoles(), STAFF)).toBe(false);
		expect(mayClose(withRoles(STAFF), null)).toBe(false);
		expect(mayClose(undefined, STAFF)).toBe(true);
	});
});

describe("readOpenTickets", () => {
	it("names who opened each, and says whether the reader may close them", async () => {
		const list = await readOpenTickets(client, guild, withRoles());

		expect(list.canClose).toBe(false);
		expect(list.tickets).toEqual([
			expect.objectContaining({
				channelName: "ticket-abc123",
				ownerName: "Kate",
				openedAt: "2026-10-25T10:00:00.000Z",
			}),
		]);
	});
});

describe("closeTicketFrom", () => {
	it("says so in the ticket, then closes it through the same flow as the button", async () => {
		await closeTicketFrom(client, guild, CHANNEL, closer, withRoles(STAFF));

		expect(send).toHaveBeenCalled();
		expect(closeTicket).toHaveBeenCalledWith(client, SETUP, TICKET, expect.objectContaining({ id: CHANNEL }), closer);
	});

	it("refuses somebody without the staff role, and a ticket from another server, before anything is sent", async () => {
		await expect(closeTicketFrom(client, guild, CHANNEL, closer, withRoles())).rejects.toThrow(UserFacingError);

		jest
			.mocked(getTicketByChannel)
			.mockResolvedValue({ ...(TICKET as object), guildId: "900000000000000002" } as never);
		await expect(closeTicketFrom(client, guild, CHANNEL, closer, withRoles(STAFF))).rejects.toThrow(
			/not open in this server/,
		);

		expect(send).not.toHaveBeenCalled();
		expect(closeTicket).not.toHaveBeenCalled();
	});
});
