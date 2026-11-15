import { Collection, type Message } from "discord.js";
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
	runChecks: jest.fn(() => Promise.resolve(null)),
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

	/** Shardlens sees slash commands through the gateway, so a prefix run reaches it only as this custom event. */
	it("tells Shardlens about a prefix run, with the person only in the context it hashes", async () => {
		const track = jest.fn();
		const client = Object.assign(fakeClient(), { shardlens: { track }, env: {} });

		await runMessageHandlers(fakeMessage("t?setwelcome"), client);

		expect(track).toHaveBeenCalledWith(
			"prefix_command",
			{
				command: "welcome",
				subcommand: "set",
				outcome: "ok",
				duration_ms: expect.any(Number) as number,
				server: "444",
				in_444: "welcome",
			},
			{ userId: "222", guildId: "444" },
		);
		expect(JSON.stringify(track.mock.calls[0]?.[1])).not.toContain("222");
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
