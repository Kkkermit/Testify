import { type APIEmbed, embedLength } from "discord.js";
import { type Command } from "@core/command";
import {
	COMMAND_LOG_LIMITS,
	CommandLog,
	commandLogEmbed,
	type CommandLogEntry,
	commandLogEntry,
	type CommandLogs,
	type CommandRun,
	flushCommandLog,
	logCommandUse,
} from "@lib/bot/commandLog.util";
import {
	CHANNEL_ID,
	createMockClient,
	createMockInteraction,
	createMockRole,
	createMockUser,
	GUILD_ID,
	type MockInteractionSetup,
	USER_ID,
} from "@tests/helpers/mocks";

const SLASH_CHANNEL = "700000000000000001";
const PREFIX_CHANNEL = "700000000000000002";

const music: Command = {
	name: "music",
	description: "d",
	category: "music",
	subcommands: [
		{
			name: "play",
			description: "d",
			options: [
				{ name: "query", description: "d", type: "string", required: true },
				{ name: "shuffle", description: "d", type: "boolean" },
				{ name: "volume", description: "d", type: "integer" },
			],
			run: () => Promise.resolve(),
		},
	],
};

const give: Command = {
	name: "give",
	description: "d",
	category: "economy",
	options: [
		{ name: "user", description: "d", type: "user", required: true },
		{ name: "role", description: "d", type: "role" },
		{ name: "note", description: "d", type: "string", unlogged: true },
	],
	run: () => Promise.resolve(),
};

const slashRun: CommandRun = { surface: "slash", ok: true, durationMs: 42.4, channelId: CHANNEL_ID };

function entry(setup: MockInteractionSetup = {}, run: Partial<CommandRun> = {}, command = music): CommandLogEntry {
	return commandLogEntry(
		createMockInteraction({ subcommand: "play", options: { query: "never gonna" }, ...setup }),
		command,
		{ ...slashRun, ...run },
		1_700_000_000_000,
	);
}

function fields(embed: APIEmbed): Record<string, string> {
	return Object.fromEntries((embed.fields ?? []).map((field) => [field.name, field.value]));
}

function fresh(): CommandLogs {
	return { slash: new CommandLog(), prefix: new CommandLog() };
}

function clientWith(
	env: Record<string, string>,
	sent: { channelId: string; embeds: APIEmbed[]; content?: string }[] = [],
) {
	return createMockClient({
		env: { DISCORD_OWNER_IDS: [], ...env },
		channels: {
			fetch: jest.fn((channelId: string) =>
				Promise.resolve({
					isTextBased: () => true,
					isSendable: () => true,
					send: jest.fn((payload: { content?: string; embeds: { toJSON(): APIEmbed }[] }) => {
						sent.push({
							channelId,
							embeds: payload.embeds.map((built) => built.toJSON()),
							...(payload.content !== undefined ? { content: payload.content } : {}),
						});
						return Promise.resolve();
					}),
				}),
			),
		},
	} as never);
}

describe("a command log entry", () => {
	it("names the command with its subcommand, who ran it and where", () => {
		const logged = entry();

		expect(logged.name).toBe("music play");
		expect(logged.prefix).toBe("/");
		expect(logged.user).toMatchObject({ id: USER_ID, username: "alice" });
		expect(logged.guild).toMatchObject({ id: GUILD_ID, name: "Test Server" });
		expect(logged.channel).toEqual({ id: CHANNEL_ID, name: "general" });
	});

	it("keeps each option given, in plain words, and leaves out the ones that were not", () => {
		const logged = entry({ subcommand: "play", options: { query: "never gonna", shuffle: true } });

		expect(logged.options).toEqual([
			{ name: "query", value: "never gonna" },
			{ name: "shuffle", value: "Yes" },
		]);
	});

	it("writes people and roles with their ids, since a mention does not render in another server", () => {
		const target = createMockUser({ id: "300000000000000003", username: "bob" });
		const logged = entry({ options: { user: target, role: createMockRole() } }, {}, give);

		expect(logged.options).toEqual([
			{ name: "user", value: "@bob (300000000000000003)" },
			{ name: "role", value: "@Staff (600000000000000006)" },
		]);
	});

	/** `/ask` promises its question is never kept, so an unlogged option is named and never read into the log. */
	it("names an unlogged option without its value", () => {
		const logged = entry({ options: { user: createMockUser(), note: "my secret question" } }, {}, give);

		expect(logged.options).toContainEqual({ name: "note", value: null });
		expect(JSON.stringify(commandLogEmbed(logged).toJSON())).not.toContain("my secret question");
	});

	it("records a direct message as having no server and no channel", () => {
		const logged = entry({ inGuild: false });

		expect(logged.guild).toBeNull();
		expect(logged.channel).toBeNull();
	});

	it("notes what a prefix run actually typed when it was an alias or another case", () => {
		const prefix = { surface: "prefix", prefix: "t?" } as const;

		expect(entry({}, { ...prefix, typed: "T?mp" }).typed).toBe("T?mp");
		expect(entry({}, { ...prefix, typed: "t?music play" }).typed).toBeNull();
		expect(entry({}, { ...prefix, typed: "T?mp" }).prefix).toBe("t?");
	});
});

describe("a command log embed", () => {
	it("leads with the command and the person, and carries every detail as its own field", () => {
		const built = commandLogEmbed(entry({ options: { query: "never gonna", volume: 50 } })).toJSON();
		const byName = fields(built);

		expect(built.title).toBe("✅ /music play");
		expect(built.author?.name).toBe("@alice");
		expect(built.author?.icon_url).toBe("https://cdn.discord/avatar.png");
		expect(built.thumbnail?.url).toBe("https://cdn.discord/avatar.png");
		expect(byName.User).toContain(`<@${USER_ID}>`);
		expect(byName.User).toContain(USER_ID);
		expect(byName.User).toContain("Account made <t:");
		expect(byName.Server).toContain("Test Server");
		expect(byName.Server).toContain(GUILD_ID);
		expect(byName.Channel).toContain("#general");
		expect(byName.Options).toBe("`query` never gonna\n`volume` 50");
		expect(byName.Result).toBe("Worked");
		expect(byName.Took).toBe("42 ms");
		expect(built.footer?.text).toBe("Slash command · Test Server");
		expect(built.timestamp).toBe(new Date(1_700_000_000_000).toISOString());
	});

	it("turns red and points at the error log when the command failed", () => {
		const built = commandLogEmbed(entry({}, { ok: false })).toJSON();

		expect(built.title).toBe("❌ /music play");
		expect(fields(built).Result).toContain("error log");
	});

	it("uses the server's prefix for a prefix run, and says what was typed", () => {
		const built = commandLogEmbed(entry({}, { surface: "prefix", prefix: "t?", typed: "T?mp" })).toJSON();

		expect(built.title).toBe("✅ t?music play");
		expect(fields(built)["Typed as"]).toBe("`T?mp`");
		expect(built.footer?.text).toBe("Prefix command · Test Server");
	});

	it("has no Options field for a run given none", () => {
		const built = commandLogEmbed(entry({ options: {} })).toJSON();
		expect(fields(built).Options).toBeUndefined();
	});
});

describe("the waiting entries", () => {
	/** Discord allows five messages in five seconds, ten embeds a message and 6,000 characters across them. */
	it("sends no more than a flush's worth, within Discord's limits, and keeps the rest for the next", () => {
		const log = new CommandLog();
		for (let index = 0; index < 400; index += 1) log.record(entry());

		const { batches } = log.take();
		expect(batches).toHaveLength(COMMAND_LOG_LIMITS.messagesPerFlush);
		for (const embeds of batches) {
			expect(embeds.length).toBeLessThanOrEqual(COMMAND_LOG_LIMITS.embedsPerMessage);
			const total = embeds.reduce((sum, built) => sum + embedLength(built.toJSON()), 0);
			expect(total).toBeLessThanOrEqual(COMMAND_LOG_LIMITS.charactersPerMessage);
		}
		expect(log.size).toBe(400 - batches.flat().length);
	});

	it("takes everything when it all fits", () => {
		const log = new CommandLog();
		for (let index = 0; index < 3; index += 1) log.record(entry());

		expect(log.take().batches.flat()).toHaveLength(3);
		expect(log.size).toBe(0);
	});

	it("drops the oldest past its limit, and says how many", () => {
		const log = new CommandLog();
		const one = entry();
		for (let index = 0; index < COMMAND_LOG_LIMITS.maxWaiting + 7; index += 1) log.record(one);

		expect(log.size).toBe(COMMAND_LOG_LIMITS.maxWaiting);
		expect(log.take().dropped).toBe(7);
	});
});

describe("logging a command", () => {
	const both = { CHANNEL_SLASH_COMMAND_LOG: SLASH_CHANNEL, CHANNEL_PREFIX_COMMAND_LOG: PREFIX_CHANNEL };
	const input = () => createMockInteraction({ subcommand: "play", options: { query: "q" } });

	it("keeps slash and prefix apart", () => {
		const logs = fresh();
		const client = clientWith(both);

		logCommandUse(client, input(), music, slashRun, logs);
		logCommandUse(client, input(), music, { ...slashRun, surface: "prefix", prefix: "t?" }, logs);
		logCommandUse(client, input(), music, { ...slashRun, surface: "prefix", prefix: "t?" }, logs);

		expect(logs.slash.size).toBe(1);
		expect(logs.prefix.size).toBe(2);
	});

	/** Nothing gathers in memory for a log nobody will read. */
	it("records nothing for a surface with no channel", () => {
		const logs = fresh();
		logCommandUse(
			clientWith({ CHANNEL_SLASH_COMMAND_LOG: SLASH_CHANNEL }),
			input(),
			music,
			{ ...slashRun, surface: "prefix" },
			logs,
		);

		expect(logs.prefix.size).toBe(0);
	});

	it("posts each surface to its own channel, an embed per run", async () => {
		const logs = fresh();
		const sent: { channelId: string; embeds: APIEmbed[] }[] = [];
		const client = clientWith(both, sent);

		logCommandUse(client, input(), music, slashRun, logs);
		logCommandUse(client, input(), music, slashRun, logs);
		logCommandUse(client, input(), music, { ...slashRun, surface: "prefix", prefix: "t?" }, logs);
		await flushCommandLog(client, logs);

		expect(sent.map(({ channelId, embeds }) => [channelId, embeds.map((built) => built.title)])).toEqual([
			[SLASH_CHANNEL, ["✅ /music play", "✅ /music play"]],
			[PREFIX_CHANNEL, ["✅ t?music play"]],
		]);
		expect(logs.slash.size + logs.prefix.size).toBe(0);
	});

	it("says how many runs were dropped above the first post", async () => {
		const logs = fresh();
		const sent: { channelId: string; embeds: APIEmbed[]; content?: string }[] = [];
		const client = clientWith(both, sent);

		const one = entry();
		for (let index = 0; index < COMMAND_LOG_LIMITS.maxWaiting + 2; index += 1) logs.slash.record(one);
		await flushCommandLog(client, logs);

		expect(sent[0]?.content).toContain("2 more were dropped");
		expect(sent[1]?.content).toBeUndefined();
	});
});
