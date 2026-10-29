import { createTranscript } from "discord-html-transcripts";
import { Collection, type Guild, type TextChannel, type User } from "discord.js";
import { strings } from "@config/strings";
import { type TicketRecord, type TicketSetupRecord } from "@database/models/tickets.schema";
import {
	addTicketMember,
	claimTicket,
	deleteTicket,
	findOpenTicket,
	removeTicketMember,
	setTicketLocked,
} from "@database/repositories/ticketRepository";
import {
	claimTicketFor,
	closeTicket,
	lockTicket,
	memberCandidates,
	openTicket,
	toggleTicketMember,
} from "@lib/tickets/ticketFlow.util";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("discord-html-transcripts", () => ({ createTranscript: jest.fn(() => Promise.resolve("transcript")) }));
jest.mock("@database/repositories/ticketRepository", () => ({
	addTicketMember: jest.fn(() => Promise.resolve()),
	claimTicket: jest.fn(() => Promise.resolve(true)),
	createTicket: jest.fn(() => Promise.resolve({})),
	deleteTicket: jest.fn(() => Promise.resolve()),
	findOpenTicket: jest.fn(() => Promise.resolve(null)),
	removeTicketMember: jest.fn(() => Promise.resolve()),
	setTicketLocked: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const HANDLER_ROLE = "300000000000000003";
const CHANNEL = "400000000000000009";

const setup: TicketSetupRecord = {
	guildId: GUILD,
	channelId: "400000000000000001",
	categoryId: "400000000000000005",
	transcriptChannelId: "400000000000000002",
	handlerRoleId: HANDLER_ROLE,
	everyoneRoleId: GUILD,
	description: "Press the button",
	buttonLabel: "Create ticket",
	buttonEmoji: "🎫",
	messageId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

function ticket(overrides: Partial<TicketRecord> = {}): TicketRecord {
	return {
		guildId: GUILD,
		ownerId: OWNER,
		memberIds: [],
		ticketId: "0007",
		channelId: CHANNEL,
		isLocked: false,
		isClaimed: false,
		claimedById: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

const owner = { id: OWNER, username: "sam", toString: () => `<@${OWNER}>` } as unknown as User;
const moderator = {
	id: "100000000000000002",
	username: "kit",
	toString: () => "<@100000000000000002>",
} as unknown as User;

function ticketChannel() {
	return {
		id: CHANNEL,
		send: jest.fn(() => Promise.resolve({})),
		delete: jest.fn(() => Promise.resolve()),
		permissionOverwrites: { edit: jest.fn(() => Promise.resolve()), delete: jest.fn(() => Promise.resolve()) },
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(findOpenTicket).mockResolvedValue(null);
	jest.mocked(claimTicket).mockResolvedValue(true as never);
});

describe("openTicket", () => {
	function guildMaking(channel: ReturnType<typeof ticketChannel>) {
		const create = jest.fn(() => Promise.resolve(channel));
		return { guild: { id: GUILD, channels: { create } } as unknown as Guild, create };
	}

	/** One open ticket per person, or a single member could fill the category. */
	it("refuses somebody who already has a ticket open, before making a channel", async () => {
		jest.mocked(findOpenTicket).mockResolvedValue(ticket());
		const { guild, create } = guildMaking(ticketChannel());

		await expect(openTicket(guild, setup, owner)).rejects.toThrow(strings.ticket.alreadyExists);
		expect(create).not.toHaveBeenCalled();
	});

	it("keeps a long username inside Discord's 100-character channel name", async () => {
		const { guild, create } = guildMaking(ticketChannel());

		await openTicket(guild, setup, { ...owner, username: "x".repeat(150), toString: owner.toString } as User);

		expect((create.mock.calls[0] as unknown as [{ name: string }])[0].name).toHaveLength(100);
	});
});

describe("lockTicket", () => {
	it("refuses to lock what is already locked, or unlock what is open", async () => {
		const channel = ticketChannel() as unknown as TextChannel;

		await expect(lockTicket(channel, ticket({ isLocked: true }), true)).rejects.toThrow(strings.ticket.alreadyLocked);
		await expect(lockTicket(channel, ticket(), false)).rejects.toThrow(strings.ticket.alreadyUnlocked);
		expect(setTicketLocked).not.toHaveBeenCalled();
	});
});

describe("claimTicketFor", () => {
	/** The claim is conditional in the database, so two handlers pressing at once cannot both hold it. */
	it("names whoever already holds it when the claim loses", async () => {
		jest.mocked(claimTicket).mockResolvedValue(false as never);

		await expect(claimTicketFor(ticket({ claimedById: "100000000000000003" }), moderator.id)).rejects.toThrow(
			"<@100000000000000003>",
		);
	});
});

describe("memberCandidates", () => {
	function guildOf(...people: { id: string; bot?: boolean; displayName: string }[]): Guild {
		const members = new Collection(
			people.map((person) => [
				person.id,
				{ id: person.id, displayName: person.displayName, user: { bot: person.bot === true } },
			]),
		);
		return { members: { fetch: jest.fn(() => Promise.resolve(members)) } } as unknown as Guild;
	}

	it("offers people, never bots or the ticket's own owner", async () => {
		const guild = guildOf(
			{ id: OWNER, displayName: "Sam" },
			{ id: "100000000000000004", displayName: "Robo", bot: true },
			{ id: "100000000000000005", displayName: "Ada" },
		);

		await expect(memberCandidates(guild, ticket())).resolves.toEqual([{ id: "100000000000000005", name: "Ada" }]);
	});
});

describe("toggleTicketMember", () => {
	const GUEST = "100000000000000005";

	it("shows somebody already on it out again", async () => {
		const channel = ticketChannel();

		await expect(
			toggleTicketMember(channel as unknown as TextChannel, ticket({ memberIds: [GUEST] }), GUEST),
		).resolves.toBe("removed");
		expect(channel.permissionOverwrites.delete).toHaveBeenCalledWith(GUEST);
		expect(removeTicketMember).toHaveBeenCalledWith(CHANNEL, GUEST);
		expect(addTicketMember).not.toHaveBeenCalled();
	});
});

describe("closeTicket", () => {
	function clientWith(destination: unknown) {
		return createMockClient({ channels: { fetch: jest.fn(() => Promise.resolve(destination)) } } as never);
	}

	/** A transcript channel that has gone must not stop the ticket closing. */
	it("still closes when the transcript channel cannot be posted in", async () => {
		const channel = ticketChannel();

		await closeTicket(
			clientWith({ isTextBased: () => true, isSendable: () => false }),
			setup,
			ticket(),
			channel as unknown as TextChannel,
			moderator,
		);

		expect(createTranscript).not.toHaveBeenCalled();
		expect(deleteTicket).toHaveBeenCalledWith(CHANNEL);
	});
});
