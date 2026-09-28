import {
	COMMAND_LOG_LIMITS,
	CommandLog,
	type CommandLogEntry,
	commandLogLine,
	type CommandLogs,
	flushCommandLog,
	logCommandUse,
} from "@lib/bot/commandLog.util";
import { createMockClient } from "@tests/helpers/mocks";

const SLASH_CHANNEL = "700000000000000001";
const PREFIX_CHANNEL = "700000000000000002";

function entry(overrides: Partial<CommandLogEntry> = {}): CommandLogEntry {
	return {
		command: "balance",
		subcommand: null,
		surface: "slash",
		userId: "100000000000000001",
		username: "kermit",
		guildName: "Testify HQ",
		channelId: "400000000000000001",
		ok: true,
		at: 1_700_000_000_000,
		...overrides,
	};
}

function fresh(): CommandLogs {
	return { slash: new CommandLog(), prefix: new CommandLog() };
}

function clientWith(env: Record<string, string>, sent: { channelId: string; title: string; text: string }[] = []) {
	return createMockClient({
		env: { DISCORD_OWNER_IDS: [], ...env },
		channels: {
			fetch: jest.fn((channelId: string) =>
				Promise.resolve({
					isTextBased: () => true,
					isSendable: () => true,
					send: jest.fn((payload: { embeds: { data: { title: string; description: string } }[] }) => {
						const [embed] = payload.embeds;
						sent.push({ channelId, title: embed!.data.title, text: embed!.data.description });
						return Promise.resolve();
					}),
				}),
			),
		},
	} as never);
}

describe("a command log line", () => {
	it("names the command, who ran it, where and whether it worked", () => {
		const line = commandLogLine(entry({ command: "music", subcommand: "queue" }));

		expect(line).toBe(
			"<t:1700000000:T> ✅ `/music queue` · **kermit** (`100000000000000001`) · Testify HQ · <#400000000000000001>",
		);
	});

	it("marks a prefix run, a failure and a direct message", () => {
		const line = commandLogLine(entry({ surface: "prefix", ok: false, guildName: null, channelId: null }));

		expect(line).toContain("❌ `prefix balance`");
		expect(line).toContain("Direct message");
	});
});

describe("the waiting entries", () => {
	/** Discord allows five messages in five seconds in one channel, so a busy minute cannot all go at once. */
	it("sends no more than a flush's worth, and keeps the rest for the next", () => {
		const log = new CommandLog();
		for (let index = 0; index < 400; index += 1) log.record(entry());

		const { lines } = log.take();
		expect(lines).toHaveLength(COMMAND_LOG_LIMITS.messagesPerFlush);
		for (const batch of lines)
			expect(batch.join("\n").length).toBeLessThanOrEqual(COMMAND_LOG_LIMITS.charactersPerMessage);
		expect(log.size).toBe(400 - lines.flat().length);
	});

	it("drops the oldest past its limit, and says how many", () => {
		const log = new CommandLog();
		for (let index = 0; index < COMMAND_LOG_LIMITS.maxWaiting + 7; index += 1) log.record(entry());

		expect(log.size).toBe(COMMAND_LOG_LIMITS.maxWaiting);
		expect(log.take().dropped).toBe(7);
	});
});

describe("logging a command", () => {
	it("keeps slash and prefix apart", () => {
		const logs = fresh();
		const client = clientWith({ CHANNEL_SLASH_COMMAND_LOG: SLASH_CHANNEL, CHANNEL_PREFIX_COMMAND_LOG: PREFIX_CHANNEL });

		logCommandUse(client, entry({ surface: "slash" }), logs);
		logCommandUse(client, entry({ surface: "prefix" }), logs);
		logCommandUse(client, entry({ surface: "prefix" }), logs);

		expect(logs.slash.size).toBe(1);
		expect(logs.prefix.size).toBe(2);
	});

	/** Nothing gathers in memory for a log nobody will read. */
	it("records nothing for a surface with no channel", () => {
		const logs = fresh();
		logCommandUse(clientWith({ CHANNEL_SLASH_COMMAND_LOG: SLASH_CHANNEL }), entry({ surface: "prefix" }), logs);

		expect(logs.prefix.size).toBe(0);
	});

	it("posts each surface to its own channel under its own heading", async () => {
		const logs = fresh();
		const sent: { channelId: string; title: string; text: string }[] = [];
		const client = clientWith(
			{ CHANNEL_SLASH_COMMAND_LOG: SLASH_CHANNEL, CHANNEL_PREFIX_COMMAND_LOG: PREFIX_CHANNEL },
			sent,
		);

		logCommandUse(client, entry({ surface: "slash", command: "daily" }), logs);
		logCommandUse(client, entry({ surface: "prefix", command: "work" }), logs);
		await flushCommandLog(client, logs);

		expect(sent).toEqual([
			{ channelId: SLASH_CHANNEL, title: "Slash commands", text: expect.stringContaining("`/daily`") as unknown },
			{
				channelId: PREFIX_CHANNEL,
				title: "Prefix commands",
				text: expect.stringContaining("`prefix work`") as unknown,
			},
		]);
		expect(logs.slash.size + logs.prefix.size).toBe(0);
	});
});
