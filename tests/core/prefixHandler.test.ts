import { Collection, type Message } from "discord.js";
import { checkCommand } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { defineCommand } from "@core/command";
import { createLogger } from "@core/logger";
import { runMessageHandlers } from "@core/message";

const prefixConfig = { prefix: "t?", isEnabled: true };

jest.mock("@database/repositories/prefixRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve(prefixConfig)),
}));
// Routing a message to the right command; the checks have their own tests.
jest.mock("@core/checks", () => ({
	checkCommand: jest.fn(() => Promise.resolve(null)),
	clearCooldowns: jest.fn(),
}));

// Imported after the mocks so the handler picks them up.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = require("@events/message/prefixCommands.event").default as {
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
		shardlens: null,
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

	it("runs one typed with a mention instead", async () => {
		await runMessageHandlers(fakeMessage(`<@${BOT}> ping`), fakeClient());
		expect(ping).toHaveBeenCalledTimes(1);
	});

	/** The SDK never reads a message, so it counts a prefix run beside slash runs only by the name the bot matched. */
	it("tells Shardlens the command it matched, by its own name, and never what was typed", async () => {
		const trackMessageCommand = jest.fn();
		const client = Object.assign(fakeClient(), { shardlens: { trackMessageCommand }, env: {} });
		const message = fakeMessage("t?setwelcome some words");

		await runMessageHandlers(message, client);

		expect(trackMessageCommand).toHaveBeenCalledTimes(1);
		const [sent, run] = trackMessageCommand.mock.calls[0] as [Message, Record<string, unknown>];
		expect(sent).toBe(message);
		expect(run).toEqual({ command: "welcome", sub: "set", durationMs: expect.any(Number) as number, failed: false });
		expect(JSON.stringify(run)).not.toMatch(/setwelcome|t\?|words/);
	});

	/** Only what the parser matched is a run, and a failure carries what was thrown for the SDK to name by class. */
	it("records a failure with what it threw, and nothing for a message that is no command", async () => {
		const trackMessageCommand = jest.fn();
		const client = Object.assign(fakeClient(), { shardlens: { trackMessageCommand }, env: {} });
		const failure = new TypeError("broke");
		ping.mockRejectedValueOnce(failure);

		await runMessageHandlers(fakeMessage("t?nosuchcommand"), client);
		expect(trackMessageCommand).not.toHaveBeenCalled();

		await runMessageHandlers(fakeMessage("t?ping"), client);
		expect(trackMessageCommand.mock.calls[0]?.[1]).toEqual({
			command: "ping",
			durationMs: expect.any(Number) as number,
			failed: true,
			error: failure,
		});
	});

	/** Slash runs already send which options were filled in, so a prefix run sends the same names, never their values. */
	it("names the options given and never what was given for them", async () => {
		const trackMessageCommand = jest.fn();
		const client = Object.assign(fakeClient(), { shardlens: { trackMessageCommand }, env: {} });
		client.commands.set(
			"give",
			defineCommand({
				name: "give",
				description: "Gives.",
				category: "economy",
				options: [
					{ name: "amount", description: "How much.", type: "integer", required: true },
					{ name: "note", description: "Why.", type: "string" },
				],
				run: jest.fn(),
			}),
		);

		await runMessageHandlers(fakeMessage("t?give 500"), client);

		const run = trackMessageCommand.mock.calls[0]?.[1] as Record<string, unknown>;
		expect(run).toMatchObject({ command: "give", options: ["amount"] });
		expect(JSON.stringify(run)).not.toContain("500");
	});

	/** A refused run is not a run, so it is counted apart, with its reason and the command's own name. */
	it("counts a refusal by its reason and runs nothing", async () => {
		const track = jest.fn();
		const trackMessageCommand = jest.fn();
		const client = Object.assign(fakeClient(), {
			shardlens: { track, trackMessageCommand },
			env: {},
			timers: { after: jest.fn() },
		});
		jest.mocked(checkCommand).mockResolvedValueOnce({ failure: "Slow down.", reason: "cooldown" });

		await runMessageHandlers(fakeMessage("t?ping"), client);

		expect(ping).not.toHaveBeenCalled();
		expect(trackMessageCommand).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			"command_refused",
			{ command: "ping", reason: "cooldown", surface: "prefix" },
			{ guildId: "444" },
		);
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
});
