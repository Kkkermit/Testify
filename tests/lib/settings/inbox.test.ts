import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { listIdeas } from "@database/repositories/ideaRepository";
import { listOpenTickets } from "@database/repositories/ticketRepository";
import { canPostInChannel } from "@lib/discord/channels.util";
import { placesOf } from "@lib/settings/featureStatus.util";
import { channelProblems, readInbox } from "@lib/settings/inbox.util";
import { type FeaturePlaces, inboxCount } from "@testify/shared";

jest.mock("@lib/settings/featureStatus.util", () => ({ placesOf: jest.fn() }));
jest.mock("@database/repositories/ideaRepository", () => ({ listIdeas: jest.fn() }));
jest.mock("@database/repositories/ticketRepository", () => ({ listOpenTickets: jest.fn() }));
jest.mock("@lib/discord/channels.util", () => ({ canPostInChannel: jest.fn() }));
jest.mock("@lib/tickets/openTickets.util", () => ({
	nameOf: jest.fn((_client: unknown, _guild: unknown, id: string) => Promise.resolve(`name-${id}`)),
}));

const guild = {
	id: "900000000000000001",
	channels: {
		cache: new Map([
			["locked", { id: "locked" }],
			["fine", { id: "fine" }],
		]),
	},
	members: { me: { permissions: { has: () => true } } },
} as unknown as Guild;

function feature(key: string, enabled: boolean, places: FeaturePlaces["places"]): FeaturePlaces {
	return { key, label: key, enabled, detail: null, reach: "channel", places };
}

beforeEach(() => {
	jest.mocked(canPostInChannel).mockImplementation((_guild, channel) => channel.id !== "locked");
});

describe("channelProblems", () => {
	/** A switched-off feature and a voice lobby are not the bot failing to post, so neither needs anybody. */
	it("names a switched-on feature whose channel is gone or refuses the bot, once per channel", () => {
		const problems = channelProblems(guild, [
			feature("welcome", true, [{ channelId: "gone", role: "posts" }]),
			feature("audit-logging", true, [
				{ channelId: "locked", role: "logs" },
				{ channelId: "locked", role: "logs" },
			]),
			feature("levelling", false, [{ channelId: "gone", role: "posts" }]),
			feature("temp-voice", true, [{ channelId: "gone", role: "lobby" }]),
			feature("starboard", true, [{ channelId: "fine", role: "posts" }]),
		]);

		expect(problems).toEqual([
			{ feature: "welcome", label: "welcome", channelId: "gone", problem: "missing" },
			{ feature: "audit-logging", label: "audit-logging", channelId: "locked", problem: "cannotPost" },
		]);
	});
});

describe("readInbox", () => {
	/** A claimed ticket already has somebody on it, so only the ones nobody has picked up are waiting. */
	it("counts only the tickets nobody has claimed, and every idea still open", async () => {
		const opened = new Date("2026-08-01T10:00:00.000Z");
		jest.mocked(placesOf).mockResolvedValue([]);
		jest.mocked(listOpenTickets).mockResolvedValue([
			{ channelId: "t1", ticketId: "1", ownerId: "u1", claimedById: null, createdAt: opened },
			{ channelId: "t2", ticketId: "2", ownerId: "u2", claimedById: "staff", createdAt: opened },
		] as never);
		jest.mocked(listIdeas).mockResolvedValue({
			total: 7,
			items: [
				{
					id: "i1",
					number: 4,
					text: "A music quiz",
					authorName: "kate",
					upVoters: ["a", "b"],
					downVoters: ["c"],
					createdAt: opened,
				},
			],
		} as never);

		const inbox = await readInbox({} as TestifyClient, guild);

		expect(inbox.tickets).toEqual({
			total: 1,
			items: [{ channelId: "t1", ticketId: "1", ownerName: "name-u1", openedAt: opened.toISOString() }],
		});
		expect(inbox.ideas.items[0]).toMatchObject({ number: 4, up: 2, down: 1 });
		expect(inboxCount(inbox)).toBe(8);
	});
});
