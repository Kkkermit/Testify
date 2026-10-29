import { type Message } from "discord.js";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { parseMessage, PrefixInteraction } from "@core/prefix";

const BOT = "111111111111111111";
const ALICE = "222222222222222222";
const BOB = "333333333333333333";

const alice = { id: ALICE, username: "alice" };
const bob = { id: BOB, username: "bob" };

interface FakeMessageParts {
	content?: string;
	mentions?: { id: string; username: string }[];
	attachments?: { url: string }[];
}

function fakeMessage(parts: FakeMessageParts = {}): Message {
	const sent: { content?: string; embeds?: unknown[] }[] = [];

	const message = {
		content: parts.content ?? "",
		author: alice,
		member: { id: ALICE },
		guild: {
			id: "444444444444444444",
			members: { cache: new Map([[BOB, { id: BOB, user: bob }]]) },
			channels: { cache: new Map([["555555555555555555", { id: "555555555555555555", name: "general" }]]) },
			roles: { cache: new Map([["666666666666666666", { id: "666666666666666666", name: "Staff" }]]) },
		},
		guildId: "444444444444444444",
		channel: { sendTyping: jest.fn() },
		client: { users: { cache: new Map([[BOB, bob]]) } },
		mentions: { users: new Map((parts.mentions ?? []).map((user) => [user.id, user])) },
		attachments: new Map((parts.attachments ?? []).map((file, index) => [String(index), file])),
		sent,
		reply: jest.fn((payload: Record<string, unknown>) => {
			sent.push(payload);
			return Promise.resolve({
				id: "999",
				edit: jest.fn((next: Record<string, unknown>) => {
					sent.push(next);
					return Promise.resolve({ id: "999" });
				}),
			});
		}),
	};

	// discord.js collections are Maps with a `find`; the tests only need that much.
	(message.mentions.users as unknown as { find: unknown }).find = (fn: (value: unknown) => boolean) =>
		[...message.mentions.users.values()].find(fn);
	for (const cache of [message.guild.members.cache, message.guild.channels.cache, message.guild.roles.cache]) {
		(cache as unknown as { find: unknown }).find = (fn: (value: unknown) => boolean) => [...cache.values()].find(fn);
	}
	(message.attachments as unknown as { first: unknown }).first = () => [...message.attachments.values()][0];

	return message as unknown as Message;
}

describe("parseMessage", () => {
	/** A phone capitalises the first letter, so `T?help` was ignored while `t?help` worked. */
	it("accepts the prefix in any case", () => {
		expect(parseMessage("T?ban bob", "t?", BOT)).toEqual({ name: "ban", args: ["bob"], prefix: "T?" });
		expect(parseMessage("tb!ping", "TB!", BOT)).toEqual({ name: "ping", args: [], prefix: "tb!" });
		expect(parseMessage("TB!ping", "tb!", BOT)).toEqual({ name: "ping", args: [], prefix: "TB!" });
		expect(parseMessage("r?ping", "t?", BOT)).toBeNull();
	});

	it("accepts a mention instead of the prefix", () => {
		expect(parseMessage(`<@${BOT}> ping`, "t?", BOT)).toEqual({ name: "ping", args: [], prefix: null });
		expect(parseMessage(`<@!${BOT}> ping`, "t?", BOT)).toEqual({ name: "ping", args: [], prefix: null });
	});
});

describe("options from a message", () => {
	const ban = defineCommand({
		name: "ban",
		description: "Bans someone.",
		category: "moderation",
		options: [
			{ name: "user", description: "Who.", type: "user", required: true },
			{ name: "reason", description: "Why.", type: "string" },
		],
		run: jest.fn(),
	});

	it("resolves a mentioned user", () => {
		const message = fakeMessage({ mentions: [bob] });
		const input = new PrefixInteraction(message, ban, [`<@${BOB}>`, "spamming"]);

		expect(input.options.getUser("user", true).id).toBe(BOB);
	});

	/** An ID worked only for somebody already cached, so `t?ban <id>` missed anybody who had left. */
	it("fetches a user given by an ID the cache does not hold, before the command reads it", async () => {
		const stranger = { id: "777777777777777777", username: "gone", bot: false };
		const message = fakeMessage();
		const users = message.client.users as unknown as { cache: Map<string, unknown>; fetch?: jest.Mock };
		const members = message.guild!.members as unknown as { fetch?: jest.Mock };
		members.fetch = jest.fn(() => Promise.reject(new Error("Unknown Member")));
		users.fetch = jest.fn((id: string) => {
			users.cache.set(id, stranger);
			return Promise.resolve(stranger);
		});
		const input = new PrefixInteraction(message, ban, [stranger.id, "raiding"]);

		expect(input.options.getUser("user")).toBeNull();
		await input.options.prepare();

		expect(users.fetch).toHaveBeenCalledWith(stranger.id);
		expect(input.options.getUser("user", true).id).toBe(stranger.id);
	});

	it("does not ask Discord about somebody already cached, or about a name", async () => {
		const message = fakeMessage();
		const users = message.client.users as unknown as { fetch?: jest.Mock };
		users.fetch = jest.fn();

		await new PrefixInteraction(message, ban, [BOB]).options.prepare();
		await new PrefixInteraction(message, ban, ["bob"]).options.prepare();

		expect(users.fetch).not.toHaveBeenCalled();
	});

	/** A missing subcommand is reported by the command's error boundary, not by the lookup ahead of it. */
	it("leaves a malformed command for the command itself to refuse", async () => {
		const grouped = defineCommand({
			name: "warn",
			description: "Warns.",
			category: "moderation",
			subcommands: [
				{
					name: "create",
					description: "Warn.",
					options: [{ name: "user", description: "Who.", type: "user", required: true }],
					run: jest.fn(),
				},
			],
		});

		await expect(
			new PrefixInteraction(fakeMessage(), grouped, ["nonsense"]).options.prepare(),
		).resolves.toBeUndefined();
	});

	it("parses numbers and rejects nonsense", () => {
		const command = defineCommand({
			name: "clear",
			description: "Clears messages.",
			category: "moderation",
			options: [{ name: "count", description: "How many.", type: "integer", required: true }],
			run: jest.fn(),
		});

		expect(new PrefixInteraction(fakeMessage(), command, ["25"]).options.getInteger("count", true)).toBe(25);
		expect(() => new PrefixInteraction(fakeMessage(), command, ["lots"]).options.getInteger("count", true)).toThrow(
			UserFacingError,
		);
	});

	it("resolves a channel from a mention", () => {
		const command = defineCommand({
			name: "say",
			description: "Says something.",
			category: "moderation",
			options: [{ name: "channel", description: "Where.", type: "channel" }],
			run: jest.fn(),
		});

		const input = new PrefixInteraction(fakeMessage(), command, ["<#555555555555555555>"]);
		expect(input.options.getChannel("channel")?.id).toBe("555555555555555555");
	});
});

describe("subcommands from a message", () => {
	const welcome = defineCommand({
		name: "welcome",
		description: "Welcome messages.",
		category: "settings",
		subcommands: [
			{
				name: "set",
				description: "Sets it.",
				options: [{ name: "channel", description: "Where.", type: "channel", required: true }],
				run: jest.fn(),
			},
			{ name: "remove", description: "Removes it.", run: jest.fn() },
		],
	});

	it("does not treat the subcommand name as an option", () => {
		const input = new PrefixInteraction(fakeMessage(), welcome, ["remove"]);
		expect(input.options.getSubcommand()).toBe("remove");
	});

	/** Building the object must not throw. */
	it("does not throw while being constructed", () => {
		expect(() => new PrefixInteraction(fakeMessage(), welcome, [])).not.toThrow();
		expect(() => new PrefixInteraction(fakeMessage(), welcome, ["nope"])).not.toThrow();
	});
});

describe("replying to a message", () => {
	const ping = defineCommand({ name: "ping", description: "Pings.", category: "info", run: jest.fn() });

	it("drops the ephemeral flag, which a normal message cannot carry", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.reply({ content: "Only for you.", flags: 64 });

		expect(message.reply).toHaveBeenCalledWith({ content: "Only for you." });
	});

	/** Stripping every flag took the V2 one too, so Discord refused every panel run with the prefix. */
	it("keeps the Components V2 flag, which a panel cannot be sent without", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.reply({ components: [], flags: 64 | 32_768 });

		expect(message.reply).toHaveBeenCalledWith({ components: [], flags: 32_768 });
	});

	/** A message cannot be private, so a private command run with the prefix cleans up after itself. */
	it("deletes a private command's reply and the message that ran it, and says when", async () => {
		const after = jest.fn();
		const deleted: string[] = [];
		const message = {
			...fakeMessage(),
			client: { timers: { after } },
			delete: jest.fn(() => {
				deleted.push("command");
				return Promise.resolve();
			}),
			reply: jest.fn((payload: Record<string, unknown>) =>
				Promise.resolve({
					id: "999",
					payload,
					edit: jest.fn(),
					delete: jest.fn(() => {
						deleted.push("reply");
						return Promise.resolve();
					}),
				}),
			),
		} as unknown as Message;
		const input = new PrefixInteraction(message, ping, []);

		input.tidyAway();
		await input.reply({ content: "Collected 500." });

		const sent = (message.reply as jest.Mock).mock.calls[0]?.[0] as { content: string };
		expect(sent.content).toMatch(/^Collected 500\.\n-# This message will be deleted <t:\d+:R>\.$/);
		expect(after).toHaveBeenCalledTimes(2);
		for (const [, waitMs] of after.mock.calls as [string, number][]) {
			expect(waitMs).toBeGreaterThan(19_000);
			expect(waitMs).toBeLessThanOrEqual(20_000);
		}

		for (const [, , run] of after.mock.calls as [string, number, () => Promise<void>][]) await run();
		expect(deleted.sort()).toEqual(["command", "reply"]);
	});

	it("turns deferReply into a typing indicator", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.deferReply();

		expect(input.deferred).toBe(true);
		expect((message.channel as unknown as { sendTyping: jest.Mock }).sendTyping).toHaveBeenCalled();
	});
});
