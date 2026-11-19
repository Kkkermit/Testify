import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { readRuns, readTopRunners } from "@lib/bot/runLog.util";
import { AnalyticsUnavailable } from "@lib/bot/shardlensReader.util";
import { runsBody } from "@testify/shared";

const ACTIVITY_KEY = `slk_activity_${"a".repeat(43)}`;
const GUILD = "900000000000000001";
const USER = "100000000000000001";
const HASH = "0123456789abcdef0123456789abcdef";
const NOW = Date.parse("2026-11-15T12:00:00.000Z");

let fetchMock: jest.SpiedFunction<typeof fetch>;

/** Where the request went, read without stringifying whatever the client handed `fetch`. */
const sentTo = (call = 0): string => {
	const input = fetchMock.mock.calls[call]?.[0];
	if (input instanceof URL) return input.href;
	return typeof input === "string" ? input : (input?.url ?? "");
};

function answers(body: unknown): void {
	fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		interactionId: "0190f1a2-0000-7000-8000-000000000001",
		ts: "2026-11-15T11:59:00.000Z",
		guildId: GUILD,
		guildName: "Test Server",
		kind: "chat_input",
		command: "warn",
		sub: "create",
		customId: null,
		outcome: "ok",
		ackMs: 120,
		userId: USER,
		username: "someone",
		avatar: HASH,
		...overrides,
	};
}

/** A client whose activity key is set, with a guild and a user the bot already knows. */
function clientFor(env: Record<string, string> = { SHARDLENS_ACTIVITY_KEY: ACTIVITY_KEY }): TestifyClient {
	return {
		env: { SHARDLENS_URL: "https://stats.example.com", ...env },
		buttons: new Collection<string, unknown>([["warnform", {}]]),
		guilds: { cache: new Collection<string, unknown>([[GUILD, { name: "From the cache" }]]) },
		users: {
			cache: new Collection<string, unknown>([
				[USER, { username: "cached", displayAvatarURL: () => "https://cdn.discordapp.com/avatars/cached.png" }],
			]),
		},
		logger: { warn: jest.fn() },
	} as unknown as TestifyClient;
}

const body = (extra: Record<string, unknown> = {}) => runsBody.parse({ days: 7, ...extra });

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, "fetch");
	answers({ rows: [], nextBefore: null });
});

describe("readRuns", () => {
	/** The filters ride in the collector's query string from the bot's own process, never in an address a browser holds. */
	it("asks the collector's log for the window and every filter, with the activity key", async () => {
		const cursor = "2026-11-15T11:00:00.000Z~0190f1a2-0000-7000-8000-000000000009";
		await readRuns(
			clientFor(),
			body({ guildId: GUILD, command: "warn", userId: USER, outcome: "failed", before: cursor }),
			NOW,
		);

		const url = new URL(sentTo());
		expect(url.origin + url.pathname).toBe("https://stats.example.com/v1/audit/log");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			from: "2026-11-09T00:00:00.000Z",
			before: cursor,
			guild: GUILD,
			command: "warn",
			user: USER,
			outcome: "failed",
		});
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			method: "GET",
			headers: { authorization: `Bearer ${ACTIVITY_KEY}` },
		});
	});

	it("says what was run and where, in the console's own shape", async () => {
		answers({ rows: [row()], nextBefore: "next-page" });

		expect(await readRuns(clientFor(), body(), NOW)).toEqual({
			rows: [
				{
					id: "0190f1a2-0000-7000-8000-000000000001",
					at: "2026-11-15T11:59:00.000Z",
					guildId: GUILD,
					guildName: "Test Server",
					kind: "chat_input",
					command: "warn",
					sub: "create",
					handler: null,
					outcome: "ok",
					answerMs: 120,
					userId: USER,
					username: "someone",
					avatarUrl: `https://cdn.discordapp.com/avatars/${USER}/${HASH}.webp?size=64`,
				},
			],
			next: "next-page",
			collector: "https://stats.example.com",
		});
	});

	/** The collector's answer is outside data, so nothing in it becomes part of an address the page loads unchecked. */
	it("builds a picture's address only from an id and a hash that are what they claim", async () => {
		answers({
			rows: [
				row({ interactionId: "a", avatar: "../../evil" }),
				row({ interactionId: "b", avatar: `${HASH}"><img src=x>` }),
				row({ interactionId: "c", userId: "../../x", avatar: HASH, username: null }),
				row({ interactionId: "d", userId: "100000000000000009", avatar: null, username: null }),
			],
			nextBefore: null,
		});

		const page = await readRuns(clientFor(), body(), NOW);

		expect(page.rows.map((run) => run.avatarUrl)).toEqual([
			"https://cdn.discordapp.com/avatars/cached.png",
			"https://cdn.discordapp.com/avatars/cached.png",
			null,
			null,
		]);
		expect(page.rows[2]?.userId).toBeNull();
	});

	/** A custom ID carries whatever its handler packed in, the person's id included, so only its name and action show. */
	it("names a component by the bot's own handler and action, and nothing else of its custom ID", async () => {
		answers({
			rows: [
				row({ interactionId: "a", kind: "button", command: null, sub: null, customId: `warnform:submit:${USER}` }),
				row({ interactionId: "b", kind: "button", command: null, sub: null, customId: "somebody-else:x" }),
			],
			nextBefore: null,
		});

		const page = await readRuns(clientFor(), body(), NOW);

		expect(page.rows.map((run) => run.handler)).toEqual(["warnform:submit", null]);
	});

	it("refuses a run whose time is no time, rather than drawing it", async () => {
		answers({ rows: [row({ ts: "<script>" })], nextBefore: null });

		await expect(readRuns(clientFor(), body(), NOW)).rejects.toEqual(new AnalyticsUnavailable("unreachable"));
	});

	it("names a server from the bot's own cache when the collector has no profile of it", async () => {
		answers({ rows: [row({ guildName: null })], nextBefore: null });

		expect((await readRuns(clientFor(), body(), NOW)).rows[0]?.guildName).toBe("From the cache");
	});

	it("is off without an activity key, and asks nobody", async () => {
		await expect(readRuns(clientFor({}), body(), NOW)).rejects.toEqual(new AnalyticsUnavailable("off"));
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("readTopRunners", () => {
	/** Labelling twenty-five people is not worth twenty-five requests to Discord, so only a known name is used. */
	it("names only people the bot already knows, and fetches nobody", async () => {
		answers({
			window: "7d",
			rows: [
				{ userId: USER, runs: 40 },
				{ userId: "100000000000000009", runs: 12 },
				{ userId: null, runs: 3 },
			],
		});

		expect(await readTopRunners(clientFor(), "7d")).toEqual({
			window: "7d",
			rows: [
				{ userId: USER, username: "cached", avatarUrl: "https://cdn.discordapp.com/avatars/cached.png", runs: 40 },
				{ userId: "100000000000000009", username: null, avatarUrl: null, runs: 12 },
				{ userId: null, username: null, avatarUrl: null, runs: 3 },
			],
		});
		expect(sentTo()).toBe("https://stats.example.com/v1/audit/top-users?window=7d");
	});
});
