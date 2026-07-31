import { type Message } from "discord.js";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { parseMessage, PrefixInteraction, splitArgs } from "@core/prefix";

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

describe("splitArgs", () => {
	it("splits on whitespace", () => {
		expect(splitArgs("ban bob spamming")).toEqual(["ban", "bob", "spamming"]);
	});

	it("keeps a quoted phrase together", () => {
		expect(splitArgs('say "hello there" now')).toEqual(["say", "hello there", "now"]);
	});

	it("collapses runs of whitespace", () => {
		expect(splitArgs("  a   b  ")).toEqual(["a", "b"]);
	});
});

describe("parseMessage", () => {
	it("reads a command behind the prefix", () => {
		expect(parseMessage("t?ban bob", "t?", BOT)).toEqual({ name: "ban", args: ["bob"] });
	});

	it("lowercases the command name but leaves the arguments alone", () => {
		expect(parseMessage("t?BaN Bob", "t?", BOT)).toEqual({ name: "ban", args: ["Bob"] });
	});

	it("accepts a mention instead of the prefix", () => {
		expect(parseMessage(`<@${BOT}> ping`, "t?", BOT)).toEqual({ name: "ping", args: [] });
		expect(parseMessage(`<@!${BOT}> ping`, "t?", BOT)).toEqual({ name: "ping", args: [] });
	});

	it("ignores anything not addressed to the bot", () => {
		expect(parseMessage("just chatting", "t?", BOT)).toBeNull();
		expect(parseMessage(`<@${BOB}> hello`, "t?", BOT)).toBeNull();
	});

	it("ignores a bare prefix with nothing after it", () => {
		expect(parseMessage("t?", "t?", BOT)).toBeNull();
		expect(parseMessage("t?   ", "t?", BOT)).toBeNull();
	});

	it("honours a server's own prefix", () => {
		expect(parseMessage("!ping", "!", BOT)).toEqual({ name: "ping", args: [] });
		expect(parseMessage("t?ping", "!", BOT)).toBeNull();
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

	it("resolves a user given by raw ID", () => {
		const input = new PrefixInteraction(fakeMessage(), ban, [BOB]);
		expect(input.options.getUser("user")?.id).toBe(BOB);
	});

	it("resolves a user given by name", () => {
		const input = new PrefixInteraction(fakeMessage(), ban, ["bob"]);
		expect(input.options.getUser("user")?.id).toBe(BOB);
	});

	it("lets the last string option swallow the rest of the message", () => {
		const input = new PrefixInteraction(fakeMessage(), ban, [BOB, "being", "a", "nuisance"]);
		expect(input.options.getString("reason")).toBe("being a nuisance");
	});

	it("returns null for an option that was not given", () => {
		const input = new PrefixInteraction(fakeMessage(), ban, [BOB]);
		expect(input.options.getString("reason")).toBeNull();
	});

	it("complains about a missing required option rather than passing null on", () => {
		const input = new PrefixInteraction(fakeMessage(), ban, []);
		expect(() => input.options.getUser("user", true)).toThrow(UserFacingError);
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

	it("reads the usual spellings of yes and no", () => {
		const command = defineCommand({
			name: "say",
			description: "Says something.",
			category: "moderation",
			options: [{ name: "as-embed", description: "As an embed.", type: "boolean" }],
			run: jest.fn(),
		});

		expect(new PrefixInteraction(fakeMessage(), command, ["yes"]).options.getBoolean("as-embed")).toBe(true);
		expect(new PrefixInteraction(fakeMessage(), command, ["no"]).options.getBoolean("as-embed")).toBe(false);
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

	it("takes an attachment off the message", () => {
		const command = defineCommand({
			name: "add",
			description: "Adds an emoji.",
			category: "moderation",
			options: [{ name: "image", description: "The image.", type: "attachment", required: true }],
			run: jest.fn(),
		});

		const input = new PrefixInteraction(fakeMessage({ attachments: [{ url: "https://cdn/x.png" }] }), command, []);
		expect(input.options.getAttachment("image", true).url).toBe("https://cdn/x.png");
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

	it("takes the subcommand from the first argument", () => {
		const input = new PrefixInteraction(fakeMessage(), welcome, ["set", "<#555555555555555555>"]);

		expect(input.options.getSubcommand()).toBe("set");
		expect(input.options.getChannel("channel", true).id).toBe("555555555555555555");
	});

	it("does not treat the subcommand name as an option", () => {
		const input = new PrefixInteraction(fakeMessage(), welcome, ["remove"]);
		expect(input.options.getSubcommand()).toBe("remove");
	});

	it("lists the choices when the subcommand is missing or wrong", () => {
		expect(() => new PrefixInteraction(fakeMessage(), welcome, []).options.getSubcommand()).toThrow(/set.*remove/s);
		expect(() => new PrefixInteraction(fakeMessage(), welcome, ["nope"]).options.getSubcommand()).toThrow(
			/set.*remove/s,
		);
	});

	/** Building the object must not throw. */
	it("does not throw while being constructed", () => {
		expect(() => new PrefixInteraction(fakeMessage(), welcome, [])).not.toThrow();
		expect(() => new PrefixInteraction(fakeMessage(), welcome, ["nope"])).not.toThrow();
	});
});

describe("replying to a message", () => {
	const ping = defineCommand({ name: "ping", description: "Pings.", category: "info", run: jest.fn() });

	it("replies to the user's message", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.reply({ content: "Pong." });

		expect(message.reply).toHaveBeenCalledWith({ content: "Pong." });
		expect(input.replied).toBe(true);
	});

	it("edits that same reply rather than sending another", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.reply({ content: "Working…" });
		await input.editReply({ content: "Done." });

		expect(message.reply).toHaveBeenCalledTimes(1);
	});

	it("drops the ephemeral flag, which a normal message cannot carry", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.reply({ content: "Only for you.", flags: 64 });

		expect(message.reply).toHaveBeenCalledWith({ content: "Only for you." });
	});

	it("turns deferReply into a typing indicator", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.deferReply();

		expect(input.deferred).toBe(true);
		expect((message.channel as unknown as { sendTyping: jest.Mock }).sendTyping).toHaveBeenCalled();
	});

	it("sends a bare string as content", async () => {
		const message = fakeMessage();
		const input = new PrefixInteraction(message, ping, []);

		await input.editReply("Just text.");

		expect(message.reply).toHaveBeenCalledWith({ content: "Just text." });
	});
});
