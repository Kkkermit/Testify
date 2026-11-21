import { createShardlens } from "@shardlens/discordjs";
import { ButtonInteraction, ChannelType, ComponentType, InteractionType, type Message } from "discord.js";
import { type Env } from "@config/env";
import { type LensTarget, TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { runButton, runCommand } from "@core/errors";
import { type Logger } from "@core/logger";
import { startEmbedded } from "@lib/bot/embeddedCollector.util";
import {
	measured,
	recordAction,
	recordEvent,
	recordMusicProblem,
	choiceOptions,
	recordPrefixRun,
	sendShardlensNow,
	shardlensLine,
	shardlensStatus,
	spoolDir,
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

let mockOptedOut: Promise<string[]> = Promise.resolve([]);
jest.mock("@database/repositories/analyticsOptOutRepository", () => ({
	readOptOuts: jest.fn(async () => mockOptedOut),
}));

let mockEmbedded: LensTarget | null = null;
jest.mock("@lib/bot/embeddedCollector.util", () => ({
	startEmbedded: jest.fn(() => Promise.resolve(mockEmbedded)),
}));

const USER = "111111111111111111";
const GUILD = "222222222222222222";
const KEY = "slk_ingest_abcdefghijklmnopqrstuvwxyz0123456789";
const CONFIGURED = { SHARDLENS_URL: "https://stats.example.com", SHARDLENS_INGEST_KEY: KEY };
const TARGET: LensTarget = {
	url: "https://stats.example.com",
	ingestKey: KEY,
	readKey: undefined,
	activityKey: undefined,
	embedded: null,
};
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
	mockOptedOut = Promise.resolve([]);
	mockEmbedded = null;
	await Promise.all(running.splice(0).map(async (client) => client.shardlens?.shutdown()));
});

describe("startShardlens", () => {
	/** An install that never asked for analytics must not gain a listener, a timer or a warning from them. */
	it("attaches nothing while nothing is set", async () => {
		const { client, said } = clientWith({});

		expect(await startShardlens(client)).toBeNull();
		expect(client.shardlens).toBeNull();
		expect(client.listenerCount("interactionCreate")).toBe(0);
		expect(said.warn).toEqual([]);
		await client.destroy();
	});

	/** The SDK checks its own settings and warns, so a wrong one must never be the reason the bot does not start. */
	it("starts with settings Shardlens cannot use, and says so only through the SDK", async () => {
		const { client } = clientWith({ SHARDLENS_URL: "not an address", SHARDLENS_INGEST_KEY: "slk_read_wrong" });
		running.push(client);

		await startShardlens(client);
		expect(shardlensStatus(client)).toMatchObject({ collector: null });
		expect(shardlensLine(client.lensTarget)).toBe("Shardlens");
	});

	it("attaches once configured, and tags what the SDK says", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);

		expect(await startShardlens(client)).toBe(client.shardlens);
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

describe("the collector inside the bot", () => {
	const OWN: LensTarget = {
		url: "http://127.0.0.1:8080",
		ingestKey: KEY,
		readKey: `slk_read_${"r".repeat(43)}`,
		activityKey: `slk_activity_${"a".repeat(43)}`,
		embedded: { dashboardUrl: "http://localhost:8080", close: () => Promise.resolve() },
	};
	const EMBEDDED = { SHARDLENS_EMBEDDED: "true", ...CONFIGURED };

	/** Settings left over for a collector elsewhere must not be sent to or read while the bot runs its own. */
	it("sends to and reads the collector it started, and says the other settings are not used", async () => {
		mockEmbedded = OWN;
		const { client, said } = clientWith(EMBEDDED);
		running.push(client);

		await startShardlens(client);
		expect(jest.mocked(createShardlens).mock.calls.at(-1)?.[1]).toMatchObject({ endpoint: OWN.url, apiKey: KEY });
		expect(client.lensTarget).toBe(OWN);
		expect(shardlensStatus(client)).toMatchObject({ collector: "http://127.0.0.1:8080", embedded: true });
		expect(shardlensLine(client.lensTarget)).toBe("Shardlens, inside the bot · dashboard at http://localhost:8080");
		expect(said.warn).toEqual(["[SHARDLENS] SHARDLENS_EMBEDDED is on, so SHARDLENS_URL and its keys are not used."]);
	});

	/** A collector that cannot start costs the analytics, never the bot, and never falls back to one elsewhere. */
	it("stays off when it cannot start", async () => {
		const { client } = clientWith(EMBEDDED);

		expect(await startShardlens(client)).toBeNull();
		expect(client.lensTarget).toMatchObject({ url: undefined, ingestKey: undefined, readKey: undefined });
		expect(client.listenerCount("interactionCreate")).toBe(0);
		await client.destroy();
	});

	it("starts nothing while the opt-outs cannot be read", async () => {
		mockOptedOut = Promise.reject(new Error("database down"));
		const { client } = clientWith(EMBEDDED);

		expect(await startShardlens(client)).toBeNull();
		expect(startEmbedded).not.toHaveBeenCalled();
		await client.destroy();
	});

	it("reads anything but true as off, and says so for anything but false", async () => {
		for (const [value, warned] of [
			["false", false],
			["yes", true],
		] as const) {
			const { client, said } = clientWith({ SHARDLENS_EMBEDDED: value });
			expect(await startShardlens(client)).toBeNull();
			expect(said.warn.length > 0).toBe(warned);
			await client.destroy();
		}
		expect(startEmbedded).not.toHaveBeenCalled();
	});
});

describe("what the SDK is started with", () => {
	/** Audit mode names who ran each command once the collector agrees; only a value the bot itself wrote may leave. */
	it("asks for audit mode, values only of fixed choices, and a spool of its own", async () => {
		const { client } = clientWith(CONFIGURED);
		client.commands.set("casino", CHOOSING);
		running.push(client);
		await startShardlens(client);

		const options = jest.mocked(createShardlens).mock.calls.at(-1)?.[1];
		expect(options).toMatchObject({ endpoint: "https://stats.example.com", apiKey: KEY });
		expect(options?.dryRun).toBeUndefined();
		expect(options?.mode).toBe("audit");
		expect(options?.auditIncludeProfile).toBe(true);
		expect(options?.captureOptionValues).toEqual(["bet", "table"]);
		expect(options?.spool).toEqual({ dir: spoolDir(TARGET) });
		expect(options?.release).toMatch(/^\d+\.\d+\.\d+/);
	});

	/** An opt-out held only in memory was forgotten at the next start, and the person counted again. */
	it("starts with everybody who opted out already left out", async () => {
		mockOptedOut = Promise.resolve([USER]);
		const { client } = clientWith(CONFIGURED);
		running.push(client);

		await startShardlens(client);

		expect(client.shardlens?.isOptedOut(USER)).toBe(true);
		expect(client.shardlens?.isOptedOut("999999999999999999")).toBe(false);
	});

	/** Starting without the list would count somebody who asked not to be; the bot itself still starts. */
	it("stays off for the run when the opt-outs cannot be read", async () => {
		mockOptedOut = Promise.reject(new Error("database down"));
		const { client } = clientWith(CONFIGURED);

		expect(await startShardlens(client)).toBeNull();
		expect(client.shardlens).toBeNull();
		expect(client.listenerCount("interactionCreate")).toBe(0);
		expect(jest.mocked(client.logger.warn).mock.calls[0]?.[1]).toMatch(/opt-outs could not be read/);
		await client.destroy();
	});

	/** Member counts are otherwise read only at start-up and when the bot joins a server. */
	it("keeps each server's member count current", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		await startShardlens(client);

		expect(jest.mocked(createShardlens).mock.calls.at(-1)?.[1]?.refreshGuildCounts).toBe(true);
	});
});

describe("recordEvent and recordAction", () => {
	/** A custom event may carry the server it happened in, never who did it and never anything they typed. */
	it("sends the bot's own names with the server as context, and no person", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);
		await startShardlens(client);
		await salted(client);

		recordEvent(client, "command_refused", { command: "work", reason: "cooldown", surface: "slash" }, GUILD);
		recordMusicProblem(client, "music_refused", "youtube", "bot-check", GUILD);
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
					props: { source: "youtube", cause: "youtube/bot-check" },
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

/** A command with one fixed list, one typed amount, one name that is typed elsewhere and a private choice. */
const CHOOSING = {
	name: "casino",
	description: "Plays.",
	category: "casino",
	subcommands: [
		{
			name: "roulette",
			description: "Spins.",
			options: [
				{ name: "bet", description: "On.", type: "string", choices: [{ name: "Red", value: "red" }] },
				{ name: "amount", description: "How much.", type: "integer" },
				{ name: "table", description: "Which.", type: "string", choices: [{ name: "Public", value: "public" }] },
				{ name: "month", description: "When.", type: "integer", choices: [{ name: "May", value: 5 }], unlogged: true },
			],
		},
	],
} as unknown as Command;

describe("choiceOptions", () => {
	/** The SDK keeps a value by option name alone, so one name typed freely anywhere must never be on the list. */
	it("lists an option only when every command declares it with fixed choices, and never a private one", () => {
		const typedTable = {
			name: "other",
			description: "Else.",
			category: "fun",
			options: [{ name: "table", description: "Typed.", type: "string" }],
		} as unknown as Command;

		expect(choiceOptions([CHOOSING])).toEqual(["bet", "table"]);
		expect(choiceOptions([CHOOSING, typedTable])).toEqual(["bet"]);
	});
});

describe("spoolDir", () => {
	/** Two installs on one machine sending to different collectors must never replay each other's events. */
	it("gives each collector and key its own folder, named without the key", () => {
		const other = spoolDir({ ...TARGET, url: "https://elsewhere.example.com" });

		expect(spoolDir(TARGET)).toBe(spoolDir({ ...TARGET }));
		expect(other).not.toBe(spoolDir(TARGET));
		expect(spoolDir(TARGET)).not.toContain(KEY);
		expect(spoolDir(TARGET)).not.toContain(KEY.slice(11, 30));
	});
});

describe("recordPrefixRun", () => {
	/** Only the SDK's own message commands are counted beside slash commands, and the text typed must never leave. */
	it("reports the command it matched as a message command, by its own name and never by what was typed", async () => {
		const { client, said } = clientWith(CONFIGURED);
		running.push(client);
		await startShardlens(client);
		await salted(client);

		recordPrefixRun(client, prefixMessage(client), {
			command: "balance",
			subcommand: "view",
			options: [{ name: "user", value: `@someone (${USER})` }],
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

	/** A prefix run reads typed text, so a value goes only for a name that is a fixed choice wherever it is declared. */
	it("sends the value of a fixed choice, and never one somebody typed or a private one", async () => {
		const { client, said } = clientWith(CONFIGURED);
		client.commands.set("casino", CHOOSING);
		running.push(client);
		await startShardlens(client);
		await salted(client);
		// What the bot hands the SDK, not only what the SDK sends: typed text must never reach it at all.
		const handed = jest.spyOn(client.shardlens!, "trackMessageCommand");

		recordPrefixRun(client, prefixMessage(client), {
			command: "casino",
			subcommand: "roulette",
			options: [
				{ name: "bet", value: "red" },
				{ name: "amount", value: "4096" },
				{ name: "month", value: null },
			],
			durationMs: 3,
			ok: true,
			error: undefined,
		});
		await sendShardlensNow(client);

		const sent = said.info.find((line) => line.includes('"message_command"')) ?? "";
		const event = JSON.parse(sent.slice(sent.indexOf("{"))) as Record<string, unknown>;
		expect(event).toMatchObject({ options: ["bet", "amount", "month"], optionValues: { bet: "red" } });
		expect(sent).not.toContain("4096");
		expect(handed.mock.calls[0]?.[1]).toMatchObject({ optionValues: { bet: "red" } });
		expect(JSON.stringify(handed.mock.calls[0]?.[1])).not.toContain("4096");
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
		await startShardlens(client);
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
		await startShardlens(client);

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
		await startShardlens(client);
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
		await startShardlens(client);

		const status = shardlensStatus(client);
		expect(status).toMatchObject({ state: "waiting", collector: "https://stats.example.com", mode: null });
		expect(JSON.stringify(status)).not.toContain("slk_");
		expect(JSON.stringify(await sendShardlensNow(client))).not.toContain("slk_");
	});

	it("counts what it sent, and has nothing waiting after", async () => {
		const { client } = clientWith(CONFIGURED);
		running.push(client);
		await startShardlens(client);
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
		const line = (url: string): string => shardlensLine({ ...TARGET, url });

		expect(line("https://stats.example.com/x")).toBe("Shardlens, sending to https://stats.example.com");
		expect(line("http://localhost:8080")).toBe("Shardlens, sending to http://localhost:8080");
		expect(line("http://stats.example.com")).toBe("Shardlens");
		expect(line("https://user:pass@stats.example.com")).toBe("Shardlens");
	});
});
