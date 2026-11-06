import { ChannelType, PermissionsBitField } from "discord.js";
import {
	claimConversation,
	closeConversation,
	dropConversation,
	getModmailSettings,
	modmailGuildIds,
	noteMessage,
	openConversationOf,
	type StoredConversation,
} from "@database/repositories/modmailRepository";
import {
	applyModmailSettings,
	closeModmail,
	offerModmail,
	relayFromMember,
	relayFromStaff,
	startConversation,
} from "@lib/modmail/modmailActions.util";

jest.mock("@database/repositories/blacklistRepository", () => ({
	findBlacklistEntry: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/commandToggleRepository", () => ({
	disabledGlobally: jest.fn(() => Promise.resolve([])),
	disabledInGuild: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/modmailRepository", () => ({
	claimConversation: jest.fn(),
	closeConversation: jest.fn(),
	countOpenConversations: jest.fn(() => Promise.resolve(0)),
	dropConversation: jest.fn(() => Promise.resolve()),
	getModmailSettings: jest.fn(),
	modmailGuildIds: jest.fn(() => Promise.resolve([])),
	noteMessage: jest.fn(() => Promise.resolve()),
	openConversationOf: jest.fn(() => Promise.resolve(null)),
	saveModmailSettings: jest.fn(() => Promise.resolve()),
	setConversationThread: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const ROLE = "300000000000000001";
const KATE = { id: "100000000000000001", username: "kate", send: jest.fn(() => Promise.resolve()) };

const settings = jest.mocked(getModmailSettings);
const claimed = jest.mocked(claimConversation);

function conversation(overrides: Partial<StoredConversation> = {}): StoredConversation {
	return {
		id: "c".repeat(24),
		guildId: GUILD,
		userId: KATE.id,
		username: KATE.username,
		threadId: "600000000000000001",
		status: "open",
		waiting: true,
		lastMessageAt: new Date("2026-11-01T00:00:00.000Z"),
		closedAt: null,
		closedBy: null,
		createdAt: new Date("2026-11-01T00:00:00.000Z"),
		...overrides,
	};
}

function world(options: { member?: boolean; threadFails?: boolean; thread?: "gone" | "locked" } = {}) {
	const thread = {
		id: "600000000000000001",
		locked: options.thread === "locked",
		archived: false,
		isThread: () => true,
		send: jest.fn(() => Promise.resolve({})),
		edit: jest.fn(() => Promise.resolve()),
	};
	const channel = {
		id: CHANNEL,
		type: ChannelType.GuildText,
		permissionsFor: () => new PermissionsBitField(PermissionsBitField.All),
		threads: {
			create: jest.fn(() =>
				options.threadFails === true ? Promise.reject(new Error("50013")) : Promise.resolve(thread),
			),
		},
	};
	const guild = {
		id: GUILD,
		name: "Testify HQ",
		members: {
			me: {},
			cache: new Map(),
			fetch: jest.fn(() => Promise.resolve(options.member === false ? null : { id: KATE.id })),
		},
		roles: { cache: new Map([[ROLE, { id: ROLE }]]) },
		channels: {
			cache: new Map([[CHANNEL, channel]]),
			fetch: jest.fn(() => Promise.resolve(options.thread === "gone" ? null : thread)),
			delete: jest.fn(() => Promise.resolve()),
		},
	};
	const client = {
		paused: false,
		isOwner: () => false,
		guilds: { cache: new Map([[GUILD, guild]]) },
		users: { fetch: jest.fn(() => Promise.resolve(KATE)) },
		logger: { debug: jest.fn(), warn: jest.fn() },
	};

	return { client: client as never, guild: guild as never, thread, channel };
}

function message(content: string) {
	return {
		content,
		attachments: new Map(),
		author: { id: KATE.id, username: KATE.username },
		guild: { id: GUILD, name: "Testify HQ" },
		member: { displayName: "Mod Sam" },
		reply: jest.fn(() => Promise.resolve()),
		react: jest.fn(() => Promise.resolve()),
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	settings.mockResolvedValue({ enabled: true, channelId: CHANNEL, pingRoleId: ROLE, anonymous: false });
	claimed.mockResolvedValue(conversation({ threadId: null }));
});

describe("startConversation", () => {
	/** The staff channel is not somewhere anybody may post into by naming the server. */
	it("refuses somebody who is not in the server, and opens nothing", async () => {
		const { client, guild, channel } = world({ member: false });

		await expect(startConversation(client, guild, KATE as never, "Somebody keeps messaging me.")).rejects.toThrow(
			/not in/,
		);
		expect(channel.threads.create).not.toHaveBeenCalled();
	});

	/** Each direct message goes to the one conversation its sender has open, so a second must be refused. */
	it("names the server a second conversation is already open with", async () => {
		const { client, guild } = world();
		claimed.mockResolvedValue(null);
		jest.mocked(openConversationOf).mockResolvedValue(conversation());

		await expect(startConversation(client, guild, KATE as never, "Hello again.")).rejects.toThrow(/Testify HQ/);
	});

	/** The opening post quotes the member, so only the role staff chose may be pinged by it. */
	it("pings the chosen role and nobody the member's words mention", async () => {
		const { client, guild, thread } = world();

		await startConversation(client, guild, KATE as never, "@everyone please help");

		expect(thread.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { roles: [ROLE] } }));
	});

	/** A claim left behind would hold the member's only conversation open with no thread for staff to read. */
	it("takes the claim back when the thread cannot be made", async () => {
		const { client, guild } = world({ threadFails: true });

		await expect(startConversation(client, guild, KATE as never, "Hello.")).rejects.toThrow(/could not open/);
		expect(dropConversation).toHaveBeenCalledWith(GUILD, conversation().id);
	});
});

describe("relaying", () => {
	/** A note to the other staff must never reach the member. */
	it("keeps a staff message starting with // in the thread", async () => {
		const { client } = world();

		await relayFromStaff(client, conversation(), message("// they did this last week too") as never, {
			enabled: true,
			channelId: CHANNEL,
			pingRoleId: null,
			anonymous: false,
		});

		expect(KATE.send).not.toHaveBeenCalled();
	});

	it("signs a reply as the server's staff when replies are anonymous, and pings nobody", async () => {
		const { client } = world();

		await relayFromStaff(client, conversation(), message("We have dealt with it.") as never, {
			enabled: true,
			channelId: CHANNEL,
			pingRoleId: null,
			anonymous: true,
		});

		expect(KATE.send).toHaveBeenCalledWith({
			content: "**Staff of Testify HQ**\nWe have dealt with it.",
			allowedMentions: { parse: [] },
		});
		expect(noteMessage).toHaveBeenCalledWith(conversation().id, false);
	});

	/** Staff closing the thread by hand must end the conversation, or the member writes into nothing. */
	it("ends the conversation when its thread is locked or gone, and tells the member", async () => {
		for (const state of ["locked", "gone"] as const) {
			jest.clearAllMocks();
			const { client, thread } = world({ thread: state });
			const dm = message("Are you there?");

			await relayFromMember(client, conversation(), dm as never);

			expect(closeConversation).toHaveBeenCalledWith(GUILD, conversation().id, null);
			expect(thread.send).not.toHaveBeenCalled();
			expect(dm.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("closed") }));
		}
	});
});

describe("a relay that fails", () => {
	/** A member whose message silently went nowhere would wait for a reply that cannot come. */
	it("tells the member it was not passed on, and owes staff nothing", async () => {
		const { client, thread } = world();
		thread.send.mockRejectedValue(new Error("50001"));
		const dm = message("Hello?");

		await relayFromMember(client, conversation(), dm as never);

		expect(dm.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining("could not pass") }),
		);
		expect(noteMessage).not.toHaveBeenCalled();
	});
});

describe("closeModmail", () => {
	it("locks the thread and tells the member when staff close it", async () => {
		const { client, thread } = world();
		jest.mocked(closeConversation).mockResolvedValue(conversation({ status: "closed" }));

		await closeModmail(client, GUILD, conversation().id, { id: "2", name: "sam" }, "staff");

		expect(thread.edit).toHaveBeenCalledWith({ locked: true, archived: true });
		expect(KATE.send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("closed") }));
	});

	it("refuses a conversation already closed", async () => {
		const { client } = world();
		jest.mocked(closeConversation).mockResolvedValue(null);

		await expect(closeModmail(client, GUILD, conversation().id, { id: "2", name: "sam" }, "staff")).rejects.toThrow(
			/already closed/,
		);
	});
});

describe("applyModmailSettings", () => {
	it("will not ping everybody, or turn on with nowhere to make threads", async () => {
		const { guild } = world();
		settings.mockResolvedValue(null);

		await expect(applyModmailSettings(guild, { pingRoleId: GUILD }, "1")).rejects.toThrow(/everybody/);
		await expect(applyModmailSettings(guild, { enabled: true }, "1")).rejects.toThrow(/Pick a channel/);
	});
});

describe("offerModmail", () => {
	/** Every direct message asking again would be noise; once in a while is enough to find the way in. */
	it("offers the shared servers once, then holds off", async () => {
		const { client } = world();
		jest.mocked(modmailGuildIds).mockResolvedValue([GUILD]);
		const dm = message("hi");

		expect(await offerModmail(client, dm as never)).toBe(true);
		expect(await offerModmail(client, dm as never)).toBe(false);
		expect(dm.reply).toHaveBeenCalledTimes(1);
	});
});
