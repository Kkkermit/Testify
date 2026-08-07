import { type Guild } from "discord.js";
import { countOpenTickets, getTicketSetup, saveTicketSetup } from "@database/repositories/ticketRepository";
import { applyTickets, normaliseTicketSetup, publishTicketPanel, readTickets } from "@lib/ticketActions.util";

jest.mock("@database/repositories/ticketRepository", () => ({
	countOpenTickets: jest.fn(() => Promise.resolve(0)),
	getTicketSetup: jest.fn(() => Promise.resolve(null)),
	saveTicketSetup: jest.fn(() => Promise.resolve({})),
}));

const GUILD = "900000000000000001";
const PANEL = "400000000000000001";
const EVERYONE = "900000000000000001";

const stored = jest.mocked(getTicketSetup);
const saved = jest.mocked(saveTicketSetup);
const counted = jest.mocked(countOpenTickets);

const send = jest.fn();

const edit = jest.fn();

function guildWith(sendable = true, existing: unknown = null): Guild {
	return {
		id: GUILD,
		channels: {
			fetch: jest.fn().mockResolvedValue({
				isSendable: () => sendable,
				send,
				messages: { fetch: jest.fn().mockResolvedValue(existing) },
			}),
		},
		roles: { everyone: { id: EVERYONE } },
	} as unknown as Guild;
}

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		channelId: PANEL,
		categoryId: "400000000000000005",
		transcriptChannelId: "400000000000000002",
		handlerRoleId: "300000000000000003",
		everyoneRoleId: EVERYONE,
		description: "Press the button",
		buttonLabel: "Create ticket",
		buttonEmoji: "🎫",
		messageId: "500000000000000001",
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
	counted.mockResolvedValue(0);
	send.mockResolvedValue({ id: "500000000000000009" });
	edit.mockResolvedValue({});
});

describe("normaliseTicketSetup", () => {
	it("gives a form something to render when nothing is set up", () => {
		const settings = normaliseTicketSetup(null);

		expect(settings).toMatchObject({ enabled: false, panelChannelId: null, posted: false, openTickets: 0 });
		expect(settings.description.length).toBeGreaterThan(0);
	});

	/** `messageId` was added after the first records were written, so it is absent rather than null on those. */
	it("treats a record written before messageId existed as unposted", () => {
		const settings = normaliseTicketSetup({ channelId: PANEL, description: "hi", buttonLabel: "Go" } as never);

		expect(settings.posted).toBe(false);
		expect(settings.enabled).toBe(true);
	});

	it("says a panel is posted once there is a message id", () => {
		expect(normaliseTicketSetup({ messageId: "5" } as never).posted).toBe(true);
	});
});

describe("readTickets", () => {
	it("reports how many tickets are open right now", async () => {
		configured();
		counted.mockResolvedValue(4);

		await expect(readTickets(guildWith())).resolves.toMatchObject({ openTickets: 4, enabled: true });
	});
});

describe("publishTicketPanel", () => {
	it("sends the panel and answers with the message it left", async () => {
		const settings = { ...normaliseTicketSetup(null), panelChannelId: PANEL };

		await expect(publishTicketPanel(guildWith(), settings)).resolves.toBe("500000000000000009");
		expect(send).toHaveBeenCalled();
	});

	it("refuses before a channel is chosen", async () => {
		await expect(publishTicketPanel(guildWith(), normaliseTicketSetup(null))).rejects.toThrow(/channel/i);
	});

	/** A channel the bot lost access to would otherwise fail as a 500 rather than as advice. */
	it("says so when the channel cannot be posted in", async () => {
		const settings = { ...normaliseTicketSetup(null), panelChannelId: PANEL };

		await expect(publishTicketPanel(guildWith(false), settings)).rejects.toThrow(/cannot post/i);
	});

	/** Posting again on a server that already has a panel would otherwise leave two buttons in the channel. */
	it("edits the panel already there rather than leaving a second one", async () => {
		const settings = { ...normaliseTicketSetup(null), panelChannelId: PANEL };
		const already = { id: "500000000000000001", edit };

		await expect(publishTicketPanel(guildWith(true, already), settings, "500000000000000001")).resolves.toBe(
			"500000000000000001",
		);
		expect(edit).toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
	});

	/** A panel somebody deleted by hand has to come back rather than failing the whole save. */
	it("posts a fresh one when the stored message is gone", async () => {
		const settings = { ...normaliseTicketSetup(null), panelChannelId: PANEL };

		await expect(publishTicketPanel(guildWith(true, null), settings, "500000000000000001")).resolves.toBe(
			"500000000000000009",
		);
		expect(send).toHaveBeenCalled();
	});
});

describe("applyTickets", () => {
	const complete = {
		panelChannelId: PANEL,
		categoryId: "400000000000000005",
		transcriptChannelId: "400000000000000002",
		staffRoleId: "300000000000000003",
	};

	it("refuses until all four destinations are chosen", async () => {
		const result = await applyTickets(guildWith(), { panelChannelId: PANEL }, EVERYONE);

		expect(result).toEqual({ problem: expect.stringMatching(/category/i) });
		expect(saved).not.toHaveBeenCalled();
	});

	it("keeps the fields the patch did not mention", async () => {
		configured();

		await applyTickets(guildWith(), { buttonLabel: "Get help" }, EVERYONE);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ buttonLabel: "Get help", channelId: PANEL }));
	});

	/**
	 * Choosing a channel must not drop a panel into it: the message is public and posting is a separate
	 * decision the admin makes once the wording is right.
	 */
	it("does not post the panel just because a channel was chosen", async () => {
		await applyTickets(guildWith(), complete, EVERYONE);

		expect(send).not.toHaveBeenCalled();
		expect(saved).toHaveBeenCalled();
	});

	it("posts when asked, and stores the message it left", async () => {
		await applyTickets(guildWith(), { ...complete, publish: true }, EVERYONE);

		expect(send).toHaveBeenCalled();
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ messageId: "500000000000000009" }));
	});

	/** A panel posted in the old channel is not the panel in the new one, so its id cannot carry over. */
	it("forgets the posted message when the channel changes", async () => {
		configured();

		await applyTickets(guildWith(), { panelChannelId: "400000000000000007" }, EVERYONE);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ messageId: null }));
	});

	it("keeps the posted message when something else changes", async () => {
		configured();

		await applyTickets(guildWith(), { buttonLabel: "Help" }, EVERYONE);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ messageId: "500000000000000001" }));
	});

	it("records the everyone role it was handed rather than reading one from the body", async () => {
		await applyTickets(guildWith(), complete, EVERYONE);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ everyoneRoleId: EVERYONE }));
	});
});
