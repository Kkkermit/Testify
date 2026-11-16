import { createShardlens } from "@shardlens/discordjs";
import { ButtonInteraction, ChannelType, ComponentType, InteractionType, type Message } from "discord.js";
import { type Env } from "@config/env";
import { TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { runButton, runCommand } from "@core/errors";
import { type Logger } from "@core/logger";
import {
	measured,
	musicCause,
	recordAction,
	recordEvent,
	recordPrefixRun,
	sendShardlensNow,
	shardlensLine,
	shardlensStatus,
	startShardlens,
} from "@lib/bot/shardlens.util";

// The bot has no dry-run setting, so a test that reads what would be sent asks the SDK for one itself.
let mockPrint = true;
jest.mock("@shardlens/discordjs", () => {
	const actual = jest.requireActual<{ createShardlens: typeof createShardlens }>("@shardlens/discordjs");
	return {
		...actual,
		createShardlens: jest.fn(
			(client: Parameters<typeof createShardlens>[0], options: Parameters<typeof createShardlens>[1]) =>
				actual.createShardlens(client, mockPrint ? { ...options, dryRun: true } : options),
		),
	};
});

const USER = "111111111111111111";
const GUILD = "222222222222222222";
const KEY = "slk_ingest_abcdefghijklmnopqrstuvwxyz0123456789";
const CONFIGURED = { SHARDLENS_URL: "https://stats.example.com", SHARDLENS_INGEST_KEY: KEY };
const TYPED = "t?bal view secret words";

interface Said {
	info: string[];
	warn: string[];
}

function clientWith(settings: Partial<Env>): { client: TestifyClient; said: Said } {
	const said: Said = { info: [], warn: [] };
	const logger = {
		debug: jest.fn(),
		trace: jest.fn(),
		error: jest.fn(),
		info: jest.fn((message: unknown) => said.info.push(String(message))),
		warn: jest.fn((message: unknown) => said.warn.push(String(message))),
	} as unknown as Logger;
	const env = { DISCORD_OWNER_IDS: [], DISABLED_FEATURES: [], NODE_ENV: "test", ...settings };
	return { client: new TestifyClient(env as unknown as Env, logger), said };
}

/** A button press as discord.js builds one, without a gateway behind it. */
function press(client: TestifyClient): ButtonInteraction {
	const interaction = Object.create(ButtonInteraction.prototype) as ButtonInteraction;
	Object.assign(interaction, {
		client,
		id: "333333333333333333",
		type: InteractionType.MessageComponent,
		componentType: ComponentType.Button,
		customId: "shop:open",
		guildId: GUILD,
		user: { id: USER, username: "tester", avatar: null },
		message: null,
	});
	return interaction;
}

/** A message that ran a prefix command, carrying text the SDK must never read. */
function prefixMessage(client: TestifyClient): Message {
	return {
		client,
		content: TYPED,
		createdTimestamp: Date.now(),
		author: { id: USER, username: "tester", avatar: null },
		guildId: GUILD,
		guild: { id: GUILD, preferredLocale: "en-GB", shardId: 0 },
		channel: { type: ChannelType.GuildText },
		member: null,
		inGuild: () => true,
	} as unknown as Message;
}

/** A dry run makes its own salt a moment after it starts, and an event with a user waits for it. */
async function salted(client: TestifyClient): Promise<void> {
	while (client.shardlens?.stats().ready !== true) await new Promise((resolve) => setImmediate(resolve));
}

const running: TestifyClient[] = [];

afterEach(async () => {
	mockPrint = true;
	await Promise.all(running.splice(0).map(async (client) => client.shardlens?.shutdown()));
});

describe("startShardlens", () => {
	/** An install that never asked for analytics must not gain a listener, a timer or a warning from them. */
	it("attaches nothing while nothing is set", async () => {
		const { client, said } = clientWith({});

		expect(startShardlens(client)).toBeNull();
		expect(client.shardlens).toBeNull();
		expect(client.listenerCount("interactionCreate")).toBe(0);
		expect(said.warn).toEqual([]);
		await client.destroy();
	});

	/** The SDK checks its own settings and warns, so a wrong one must never be the reason the bot does not start. */
	it("starts with settings Shardlens cannot use, and says so only through the SDK", () => {
		const { client } = clientWith({ SHARDLENS_URL: "not an address", SHARDLENS_INGEST_KEY: "slk_read_wrong" });
		running.push(client);

		expect(() => startShardlens(client)).not.toThrow();
		expect(shardlensStatus(client)).toMatchObject({ collector: null });
		expect(shardlensLine(client.env)).toBe("Shardlens");
	});

	it("attaches once configured, and tags what the SDK says", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);

		expect(startShardlens(client)).toBe(client.shardlens);
		await salted(client);
		recordPrefixRun(client, prefixMessage(client), {
			command: "help",
			subcommand: null,
			options: [],
			durationMs: 1,
			ok: true,
			error: undefined,
		});
		await sendShardlensNow(client);

		expect(said.info.length).toBeGreaterThan(0);
		expect(said.info.every((line) => line.startsWith("[SHARDLENS] "))).toBe(true);
	});
});

describe("what the SDK is started with", () => {
	/** Audit mode names who ran each command once the collector agrees; option values must still never leave. */
	it("asks for audit mode and records no option values", () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);

		const options = jest.mocked(createShardlens).mock.calls.at(-1)?.[1];
		expect(options).toMatchObject({ endpoint: "https://stats.example.com", apiKey: KEY });
		expect(options?.dryRun).toBeUndefined();
		expect(options?.mode).toBe("audit");
		expect(options?.captureOptionValues).toBeUndefined();
		expect(options?.release).toMatch(/^\d+\.\d+\.\d+/);
	});

	/** Member counts are otherwise read only at start-up and when the bot joins a server. */
	it("keeps each server's member count current", () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);

		expect(jest.mocked(createShardlens).mock.calls.at(-1)?.[1]?.refreshGuildCounts).toBe(true);
	});
});

describe("recordEvent and recordAction", () => {
	/** A custom event may carry the server it happened in, never who did it and never anything they typed. */
	it("sends the bot's own names with the server as context, and no person", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);
		await salted(client);

		recordEvent(client, "command_refused", { command: "work", reason: "cooldown", surface: "slash" }, GUILD);
		recordEvent(client, "music_refused", {
			source: "youtube",
			reason: "bot-check",
			cause: musicCause("youtube", "bot-check"),
		});
		recordAction(client, "level_up", GUILD);
		await sendShardlensNow(client);

		const custom = said.info
			.filter((line) => line.includes('"custom"'))
			.map((line) => JSON.parse(line.slice(line.indexOf("{"))) as Record<string, unknown>);
		expect(custom).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "command_refused",
					props: { command: "work", reason: "cooldown", surface: "slash" },
					guild: GUILD,
				}),
				expect.objectContaining({
					name: "music_refused",
					props: expect.objectContaining({ cause: "youtube/bot-check" }),
				}),
				expect.objectContaining({ name: "level_up", guild: GUILD }),
			]),
		);
		expect(custom.every((event) => event.user === undefined)).toBe(true);
		expect(said.info.join("\n")).not.toContain(USER);
	});

	it("does nothing while Shardlens is off", async () => {
		const { client } = clientWith({});

		expect(() => {
			recordEvent(client, "dashboard_change", { screen: "/guilds/:guildId/welcome", how: "save" });
			recordAction(client, "raid_hold");
		}).not.toThrow();
		await client.destroy();
	});
});

describe("recordPrefixRun", () => {
	/** Only the SDK's own message commands are counted beside slash commands, and the text typed must never leave. */
	it("reports the command it matched as a message command, by its own name and never by what was typed", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);
		await salted(client);

		recordPrefixRun(client, prefixMessage(client), {
			command: "balance",
			subcommand: "view",
			options: ["user"],
			durationMs: 12.6,
			ok: false,
			error: new TypeError("the words somebody typed"),
		});
		await sendShardlensNow(client);

		const sent = said.info.find((line) => line.includes('"message_command"'));
		expect(sent).toBeDefined();
		const event = JSON.parse(sent?.slice(sent.indexOf("{")) ?? "{}") as Record<string, unknown>;
		expect(event).toMatchObject({
			type: "message_command",
			command: "balance",
			sub: "view",
			options: ["user"],
			outcome: "error",
			errorClass: "TypeError",
			handlerMs: 13,
			guild: GUILD,
		});
		expect(event.user).toMatch(/^h1:/);
		const everything = said.info.join("\n");
		expect(everything).not.toContain(USER);
		expect(everything).not.toContain("secret words");
		expect(everything).not.toContain("the words somebody typed");
		expect(said.info.some((line) => line.includes('"custom"'))).toBe(false);
	});

	it("does nothing while Shardlens is off", async () => {
		const { client } = clientWith({});

		expect(() => {
			recordPrefixRun(client, prefixMessage(client), {
				command: "help",
				subcommand: null,
				options: [],
				durationMs: 1,
				ok: true,
				error: undefined,
			});
		}).not.toThrow();
		await client.destroy();
	});
});

describe("measured", () => {
	it("runs the handler and hands back its own error unchanged, so the bot's error handling still runs", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);
		const failure = new Error("boom");

		await expect(measured(client, press(client), () => Promise.reject(failure))).rejects.toBe(failure);
		const work = jest.fn(() => Promise.resolve());
		await measured(client, press(client), work);
		expect(work).toHaveBeenCalledTimes(1);
	});

	/** The wrap is what times the handler, so an interaction it never saw would be recorded without a handler time. */
	it("hands a real interaction to Shardlens, and only a real one", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);

		// A prefix run would otherwise be counted as one of the SDK's own failures every time.
		await measured(client, { user: { id: USER } }, () => Promise.resolve());
		expect(client.shardlens?.stats().pendingInteractions).toBe(0);
		expect(client.shardlens?.stats().internalErrors).toEqual({});

		await measured(client, press(client), () => Promise.resolve());
		expect(client.shardlens?.stats().pendingInteractions).toBe(1);
	});

	it("just runs the handler while Shardlens is off", async () => {
		const { client } = clientWith({});
		const work = jest.fn(() => Promise.resolve());

		await measured(client, press(client), work);
		expect(work).toHaveBeenCalledTimes(1);
		await client.destroy();
	});
});

describe("the bot's runners", () => {
	/** Shardlens times a handler only through the wrap, so a runner that skipped it would report no handler times. */
	it("hand commands and buttons to Shardlens as they run", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);
		const command = { name: "ping", description: "Pings.", category: "fun", run: jest.fn(() => Promise.resolve()) };

		await runCommand(press(client) as never, command as unknown as Command, client);
		expect(command.run).toHaveBeenCalledTimes(1);
		expect(client.shardlens?.stats().pendingInteractions).toBe(1);

		const second = Object.assign(press(client), { id: "333333333333333334" });
		await runButton(second, () => Promise.resolve(), client, "shop");
		expect(client.shardlens?.stats().pendingInteractions).toBe(2);
	});
});

describe("shardlensStatus", () => {
	it("says it is off while nothing is set", async () => {
		const { client } = clientWith({});

		expect(shardlensStatus(client)).toMatchObject({ state: "off", collector: null });
		expect(await sendShardlensNow(client)).toBeNull();
		await client.destroy();
	});

	/** The page and the command both show this, so the ingest key must never be in it, nor anything but the origin. */
	it("names the collector by its origin and never carries the key", async () => {
		mockPrint = false;
		const { client } = clientWith({
			SHARDLENS_URL: "https://stats.example.com/v1/?token=x#y",
			SHARDLENS_INGEST_KEY: KEY,
		});
		running.push(client);
		startShardlens(client);

		const status = shardlensStatus(client);
		expect(status).toMatchObject({ state: "waiting", collector: "https://stats.example.com", mode: null });
		expect(JSON.stringify(status)).not.toContain("slk_");
		expect(JSON.stringify(await sendShardlensNow(client))).not.toContain("slk_");
	});

	it("counts what it sent, and has nothing waiting after", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		startShardlens(client);
		await salted(client);
		recordPrefixRun(client, prefixMessage(client), {
			command: "help",
			subcommand: null,
			options: [],
			durationMs: 1,
			ok: true,
			error: undefined,
		});

		const flush = await sendShardlensNow(client);
		expect(flush).toMatchObject({ problem: null, status: { state: "sending", queued: 0 } });
		expect(flush?.sent).toBeGreaterThan(0);
	});
});

describe("shardlensLine", () => {
	/** The read key goes where this address points, so one it may not go to is named as nothing at all. */
	it("names where it sends and never the key, nor an address the key may not go to", () => {
		const line = (url: string): string =>
			shardlensLine({ SHARDLENS_URL: url, SHARDLENS_INGEST_KEY: KEY } as unknown as Env);

		expect(line("https://stats.example.com/x")).toBe("Shardlens, sending to https://stats.example.com");
		expect(line("http://localhost:8080")).toBe("Shardlens, sending to http://localhost:8080");
		expect(line("http://stats.example.com")).toBe("Shardlens");
		expect(line("https://user:pass@stats.example.com")).toBe("Shardlens");
	});
});
