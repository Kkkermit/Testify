import { Collection, type Message } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineCommand } from "@core/command";
import { createLogger } from "@core/logger";
import { runMessageHandlers } from "@core/message";

const prefixConfig = { prefix: "t?", isEnabled: true };

jest.mock("@database/repositories/settingsRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve(prefixConfig)),
}));
// The checks themselves have their own tests; this is about routing a message
// to the right command, which is what broke.
jest.mock("@core/checks", () => ({
	runChecks: jest.fn(() => Promise.resolve(null)),
	clearCooldowns: jest.fn(),
}));

// Imported after the mocks so the handler picks them up.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = require("../../src/events/message/prefixCommands").default as {
	run(message: Message, client: TestifyClient): Promise<boolean | void>;
};

const BOT = "111111111111111111";

const ping = jest.fn();
const settings = jest.fn();

function fakeClient(): TestifyClient {
	const commands = new Collection<string, ReturnType<typeof defineCommand>>();
	commands.set("ping", defineCommand({ name: "ping", description: "Pings.", category: "info", run: ping }));
	commands.set(
		"welcome",
		defineCommand({
			name: "welcome",
			description: "Welcome messages.",
			category: "settings",
			subcommands: [{ name: "set", description: "Sets it.", aliases: ["setwelcome"], run: settings }],
		}),
	);

	return {
		commands,
		aliases: new Collection<string, string>([["setwelcome", "welcome set"]]),
		messageHandlers: [handler],
		logger: createLogger("fatal", false),
		user: { id: BOT },
		isOwner: () => false,
	} as unknown as TestifyClient;
}

function fakeMessage(content: string, inGuild = true): Message & { sent: unknown[] } {
	const sent: unknown[] = [];
	return {
		sent,
		content,
		system: false,
		webhookId: null,
		author: { id: "222", bot: false, username: "alice" },
		member: { id: "222" },
		guild: inGuild ? { id: "444" } : null,
		guildId: inGuild ? "444" : null,
		channel: { sendTyping: jest.fn() },
		client: { users: { cache: new Collection() } },
		mentions: { users: new Collection() },
		attachments: new Collection(),
		reply: jest.fn((payload: unknown) => {
			sent.push(payload);
			return Promise.resolve({ id: "9", edit: jest.fn(() => Promise.resolve({ id: "9" })) });
		}),
	} as unknown as Message & { sent: unknown[] };
}

describe("the prefix handler", () => {
	beforeEach(() => {
		ping.mockClear();
		settings.mockClear();
	});

	it("runs a command typed with the prefix", async () => {
		await runMessageHandlers(fakeMessage("t?ping"), fakeClient());
		expect(ping).toHaveBeenCalledTimes(1);
	});

	it("runs one typed with a mention instead", async () => {
		await runMessageHandlers(fakeMessage(`<@${BOT}> ping`), fakeClient());
		expect(ping).toHaveBeenCalledTimes(1);
	});

	/** `/help` declares autocomplete, and refusing those made `t?help` fail. */
	it("runs a command that also offers autocomplete", async () => {
		const autocompleting = jest.fn();
		const client = fakeClient();
		client.commands.set(
			"help",
			defineCommand({
				name: "help",
				description: "Help.",
				category: "info",
				run: autocompleting,
				autocomplete: jest.fn(),
			}),
		);

		await runMessageHandlers(fakeMessage("t?help"), client);
		expect(autocompleting).toHaveBeenCalledTimes(1);
	});

	it("works in a direct message, where no server prefix exists", async () => {
		await runMessageHandlers(fakeMessage("t?ping", false), fakeClient());
		expect(ping).toHaveBeenCalledTimes(1);
	});

	it("follows an alias through to a subcommand", async () => {
		await runMessageHandlers(fakeMessage("t?setwelcome #general"), fakeClient());
		expect(settings).toHaveBeenCalledTimes(1);
	});

	it("ignores an ordinary message", async () => {
		await runMessageHandlers(fakeMessage("hello everyone"), fakeClient());
		expect(ping).not.toHaveBeenCalled();
	});

	it("ignores a bare prefix", async () => {
		await runMessageHandlers(fakeMessage("t?"), fakeClient());
		expect(ping).not.toHaveBeenCalled();
	});

	it("stays quiet in a server that switched text commands off", async () => {
		prefixConfig.isEnabled = false;
		await runMessageHandlers(fakeMessage("t?ping"), fakeClient());
		prefixConfig.isEnabled = true;

		expect(ping).not.toHaveBeenCalled();
	});

	it("uses whatever prefix the server chose", async () => {
		prefixConfig.prefix = "!";
		await runMessageHandlers(fakeMessage("!ping"), fakeClient());
		prefixConfig.prefix = "t?";

		expect(ping).toHaveBeenCalledTimes(1);
	});

	it("says nothing when the command does not exist", async () => {
		const message = fakeMessage("t?notacommand");
		await runMessageHandlers(message, fakeClient());
		expect(message.sent).toEqual([]);
	});
});
