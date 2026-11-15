import { createShardlens } from "@shardlens/discordjs";
import { ButtonInteraction, ComponentType, InteractionType } from "discord.js";
import { type Env } from "@config/env";
import { TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { runButton, runCommand } from "@core/errors";
import { type Logger } from "@core/logger";
import {
	measured,
	recordPrefixRun,
	sendShardlensNow,
	shardlensLine,
	shardlensStatus,
	startShardlens,
} from "@lib/bot/shardlens.util";

jest.mock("@shardlens/discordjs", () => {
	const actual = jest.requireActual<{ createShardlens: typeof createShardlens }>("@shardlens/discordjs");
	return { ...actual, createShardlens: jest.fn(actual.createShardlens) };
});

const USER = "111111111111111111";
const GUILD = "222222222222222222";
const KEY = "slk_ingest_abcdefghijklmnopqrstuvwxyz0123456789";

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
	const env = { DISCORD_OWNER_IDS: [], DISABLED_FEATURES: [], NODE_ENV: "test", SHARDLENS_DRY_RUN: false, ...settings };
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

/** A dry run makes its own salt a moment after it starts, and an event with a user waits for it. */
async function salted(client: TestifyClient): Promise<void> {
	while (client.shardlens?.stats().ready !== true) await new Promise((resolve) => setImmediate(resolve));
}

const running: TestifyClient[] = [];

afterEach(async () => {
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

	it("attaches once configured, and tags what the SDK says", async () => {
		const { client, said } = clientWith({ SHARDLENS_DRY_RUN: true });
		running.push(client);

		expect(startShardlens(client)).toBe(client.shardlens);
		await salted(client);
		recordPrefixRun(client, {
			command: "help",
			subcommand: null,
			ok: true,
			durationMs: 1,
			userId: USER,
			guildId: null,
		});
		await sendShardlensNow(client);

		expect(said.info.length).toBeGreaterThan(0);
		expect(said.info.every((line) => line.startsWith("[SHARDLENS] "))).toBe(true);
	});
});

describe("what the SDK is started with", () => {
	/** Audit mode names who ran each command once the collector agrees; option values must still never leave. */
	it("asks for audit mode and records no option values", () => {
		const { client } = clientWith({ SHARDLENS_URL: "https://stats.example.com", SHARDLENS_INGEST_KEY: KEY });
		running.push(client);
		startShardlens(client);

		const options = jest.mocked(createShardlens).mock.calls.at(-1)?.[1];
		expect(options).toMatchObject({ endpoint: "https://stats.example.com", apiKey: KEY, dryRun: false });
		expect(options?.mode).toBe("audit");
		expect(options?.captureOptionValues).toBeUndefined();
		expect(options?.release).toMatch(/^\d+\.\d+\.\d+/);
	});
});

describe("recordPrefixRun", () => {
	/** A prefix run is a custom event, and the person running it may only ever leave the bot as a hash. */
	it("sends the command and how it went, with the user hashed and never in the properties", async () => {
		const { client, said } = clientWith({ SHARDLENS_DRY_RUN: true });
		running.push(client);
		startShardlens(client);
		await salted(client);

		recordPrefixRun(client, {
			command: "balance",
			subcommand: "view",
			ok: false,
			durationMs: 12.6,
			userId: USER,
			guildId: GUILD,
		});
		await sendShardlensNow(client);

		const sent = said.info.find((line) => line.includes('"prefix_command"'));
		expect(sent).toBeDefined();
		const event = JSON.parse(sent?.slice(sent.indexOf("{")) ?? "{}") as Record<string, unknown>;
		expect(event).toMatchObject({
			type: "custom",
			name: "prefix_command",
			props: { command: "balance", subcommand: "view", outcome: "error", duration_ms: 13 },
			guild: GUILD,
		});
		expect(event.user).toMatch(/^h1:/);
		expect(said.info.join("\n")).not.toContain(USER);
	});

	it("does nothing while Shardlens is off", async () => {
		const { client } = clientWith({});

		expect(() => {
			recordPrefixRun(client, {
				command: "help",
				subcommand: null,
				ok: true,
				durationMs: 1,
				userId: USER,
				guildId: null,
			});
		}).not.toThrow();
		await client.destroy();
	});
});

describe("measured", () => {
	it("runs the handler and hands back its own error unchanged, so the bot's error handling still runs", async () => {
		const { client } = clientWith({ SHARDLENS_DRY_RUN: true });
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
		const { client } = clientWith({ SHARDLENS_DRY_RUN: true });
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
		const { client } = clientWith({ SHARDLENS_DRY_RUN: true });
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

	it("reports a dry run as one, with what it has printed counted as sent", async () => {
		const { client } = clientWith({ SHARDLENS_DRY_RUN: true });
		running.push(client);
		startShardlens(client);
		await salted(client);
		recordPrefixRun(client, {
			command: "help",
			subcommand: null,
			ok: true,
			durationMs: 1,
			userId: USER,
			guildId: null,
		});

		const flush = await sendShardlensNow(client);
		expect(flush).toMatchObject({ problem: null, status: { state: "dryRun", queued: 0 } });
	});
});

describe("shardlensLine", () => {
	it("names where it sends and never the key", () => {
		const env = { SHARDLENS_URL: "https://stats.example.com/x", SHARDLENS_INGEST_KEY: KEY, SHARDLENS_DRY_RUN: false };

		expect(shardlensLine(env as unknown as Env)).toBe("Shardlens, sending to https://stats.example.com");
		expect(shardlensLine({ ...env, SHARDLENS_DRY_RUN: true } as unknown as Env)).toMatch(/dry run/);
	});
});
