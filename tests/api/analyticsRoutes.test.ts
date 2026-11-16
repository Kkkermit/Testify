import { Collection } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { analytics } from "@api/routes/analytics";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { logRing } from "@core/logRing";
import { findLogRun, listLogRuns, readLogLines } from "@database/repositories/logRepository";
import {
	AnalyticsUnavailable,
	audienceReport,
	funnelReport,
	guildUsageReport,
	retentionReport,
	usageReport,
} from "@lib/bot";
import { type GuildUsageReport, type LogFeed, type LogRuns, type RuntimeInfo, type UsageReport } from "@testify/shared";

jest.mock("@lib/bot", () => ({
	...jest.requireActual<object>("@lib/bot"),
	usageReport: jest.fn(),
	guildUsageReport: jest.fn(),
	audienceReport: jest.fn(() => Promise.resolve({ days: 30 })),
	funnelReport: jest.fn(() => Promise.resolve({ days: 30 })),
	retentionReport: jest.fn(() => Promise.resolve({ days: 30 })),
}));
jest.mock("@database/repositories/logRepository", () => ({
	findLogRun: jest.fn(() => Promise.resolve(null)),
	listLogRuns: jest.fn(() => Promise.resolve([])),
	readLogLines: jest.fn(() => Promise.resolve({ lines: [], matched: 0, held: 0 })),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const GUILD = "900000000000000001";
const CHANNEL = "700000000000000001";

const REPORT = { days: 30, runs: 0 } as UsageReport;
const GUILD_REPORT = { days: 30, runs: 0 } as GuildUsageReport;

function appFor(userId = OWNER): Hono<ApiBindings> {
	const client = {
		guilds: {
			cache: new Collection<string, unknown>([
				[
					GUILD,
					{
						id: GUILD,
						name: "Test Server",
						memberCount: 1_234,
						iconURL: () => null,
						joinedAt: new Date("2026-01-01T00:00:00.000Z"),
						channels: { cache: new Collection([[CHANNEL, { name: "general" }]]) },
					},
				],
			]),
		},
		commands: new Collection<string, unknown>([
			["economy", {}],
			["work", {}],
		]),
		isOwner: (id: string) => id === OWNER,
		eventNames: () => ["ready", "interactionCreate"],
		startedAt: Date.now() - 60_000,
		users: { cache: new Collection<string, unknown>() },
		channels: { cache: new Collection<string, unknown>() },
		ws: { ping: 42, shards: new Collection<string, unknown>() },
		env: { NODE_ENV: "test", LOG_LEVEL: "warn" } as Env,
		logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
	} as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", { LOG_LEVEL: "warn" } as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId } as never);
		await next();
	});
	app.route("/analytics", analytics);
	answerLikeTheApp(app);

	return app;
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(usageReport).mockResolvedValue(REPORT);
	jest.mocked(guildUsageReport).mockResolvedValue(GUILD_REPORT);
	logRing.clear();
});

const OWNER_ONLY = [
	"/analytics/usage",
	"/analytics/audience",
	"/analytics/funnel?steps=economy,work",
	`/analytics/guilds/${GUILD}`,
	"/analytics/logs",
	"/analytics/runtime",
];

describe("who can read the analytics", () => {
	/** These name every server the bot is in and how much each is used — owner-only, like the rest of it. */
	it.each(OWNER_ONLY)("hides %s from a manager", async (path) => {
		expect((await appFor(MANAGER).request(path)).status).toBe(404);
	});

	it.each(OWNER_ONLY)("serves %s to the owner", async (path) => {
		expect((await appFor().request(path)).status).toBe(200);
	});

	/** Who ran what lives behind the collector's own sign-in, so no console route may show it. */
	it("no longer serves the member list or the run log", async () => {
		for (const path of [`/analytics/guilds/${GUILD}/members`, `/analytics/guilds/${GUILD}/runs`]) {
			expect((await appFor().request(path)).status).toBe(404);
		}
	});
});

describe("the usage report", () => {
	it("takes the window from the query, and refuses one it does not support", async () => {
		await appFor().request("/analytics/usage?days=7");
		expect(jest.mocked(usageReport).mock.calls[0]?.[1]).toBe(7);
		expect((await appFor().request("/analytics/usage?days=365")).status).toBe(400);
	});

	/** Shardlens being away is not the bot failing, so each reason is its own code the console can word. */
	it("answers 503 with a code naming why Shardlens could not be read", async () => {
		for (const problem of ["off", "refused", "unreachable"] as const) {
			jest.mocked(usageReport).mockRejectedValueOnce(new AnalyticsUnavailable(problem));
			const response = await appFor().request("/analytics/usage");

			expect(response.status).toBe(503);
			expect(((await response.json()) as { error: { code: string } }).error.code).toBe(`analytics_${problem}`);
		}
	});
});

describe("the sections read in the reader's time", () => {
	it("takes the reader's zone, and refuses one that is no zone", async () => {
		await appFor().request("/analytics/audience?days=7&tz=Europe%2FLondon");
		expect(jest.mocked(audienceReport).mock.calls[0]?.slice(1, 3)).toEqual([7, "Europe/London"]);

		for (const tz of ["Mars/Olympus", "../../etc", "UTC; DROP"]) {
			expect((await appFor().request(`/analytics/audience?tz=${encodeURIComponent(tz)}`)).status).toBe(400);
		}
	});

	/** A step is asked about by name, so only the bot's own commands are ever put to the collector. */
	it("follows only the bot's own commands, two to five of them", async () => {
		expect((await appFor().request("/analytics/funnel?steps=economy,work&hours=72")).status).toBe(200);
		expect(jest.mocked(funnelReport).mock.calls[0]?.[1]).toMatchObject({ steps: ["economy", "work"], hours: 72 });

		const refused = await appFor().request("/analytics/funnel?steps=economy,secret");
		expect(refused.status).toBe(400);
		expect(((await refused.json()) as { error: { code: string } }).error.code).toBe("unknown_command");
		expect((await appFor().request("/analytics/funnel?steps=economy")).status).toBe(400);
		expect((await appFor().request("/analytics/funnel?steps=economy,work&hours=5")).status).toBe(400);
		expect((await appFor().request("/analytics/retention?start=economy&back=secret")).status).toBe(400);
		expect((await appFor().request("/analytics/retention?start=economy&interval=week")).status).toBe(200);
		expect(jest.mocked(retentionReport).mock.calls[0]?.[1]).toMatchObject({ start: "economy", interval: "week" });
	});
});

describe("one server's usage", () => {
	/** The path names the server, so a drill-down can never be another server's figures. */
	it("reads the server in the path, and refuses one the bot is not in", async () => {
		await appFor().request(`/analytics/guilds/${GUILD}?days=90`);
		const [, guild, days] = jest.mocked(guildUsageReport).mock.calls[0] ?? [];

		expect((guild as { id: string } | undefined)?.id).toBe(GUILD);
		expect(days).toBe(90);
		expect((await appFor().request("/analytics/guilds/900000000000000009")).status).toBe(404);
	});

	it("answers 503 when Shardlens refuses the key", async () => {
		jest.mocked(guildUsageReport).mockRejectedValueOnce(new AnalyticsUnavailable("refused"));

		expect((await appFor().request(`/analytics/guilds/${GUILD}`)).status).toBe(503);
	});
});

describe("the log feed", () => {
	/** The buffer redacts on the way in; this is the check that nothing sensitive can reach a browser. */
	it("never sends a secret it was handed", async () => {
		logRing.push({ at: Date.now(), level: "error", message: "boom", context: { MONGODB_URI: "mongodb://a:b@c" } });

		const body = await (await appFor().request("/analytics/logs")).text();

		expect(body).not.toContain("mongodb://a:b@c");
		expect(body).toContain("[redacted]");
	});

	it("rejects a level pino does not have", async () => {
		expect((await appFor().request("/analytics/logs?level=verbose")).status).toBe(400);
	});

	/** Every level, so a debug line put in the buffer can be got back out. */
	it("serves debug and trace", async () => {
		logRing.push({ at: Date.now(), level: "debug", message: "fine detail", context: {} });

		const feed = (await (await appFor().request("/analytics/logs?level=trace")).json()) as LogFeed;

		expect(feed.lines.map((line) => line.message)).toContain("fine detail");
	});

	/** The console reports the logger's level, so an empty list is not mistaken for an idle bot. */
	it("reports the level the bot's own logger is running at", async () => {
		const feed = (await (await appFor().request("/analytics/logs")).json()) as LogFeed;

		expect(feed.loggerLevel).toBe("warn");
	});

	/** Showing 200 of 640 is a different thing from finding exactly 200, and the page has to say which. */
	it("counts what matched before the limit cut the list", async () => {
		for (const index of [0, 1, 2])
			logRing.push({ at: Date.now(), level: "info", message: `line ${String(index)}`, context: {} });

		const feed = (await (await appFor().request("/analytics/logs?limit=2")).json()) as LogFeed;

		expect(feed.lines).toHaveLength(2);
		expect(feed.matched).toBe(3);
	});

	const PAST = "00000000-0000-4000-8000-000000000001";

	/** A past run is read from the database, its stored context back to the object it was, its stack intact. */
	it("reads a past run from the database, filtered as asked", async () => {
		jest.mocked(findLogRun).mockResolvedValueOnce({
			run: PAST,
			startedAt: new Date(0),
			endedAt: null,
			lastAt: null,
			version: "2.4.0",
		});
		jest.mocked(readLogLines).mockResolvedValueOnce({
			lines: [
				{
					seq: 9,
					at: new Date(0),
					level: "error",
					rank: 50,
					message: "[COMMAND_ERROR] A command failed.",
					context: '{"err":{"stack":"DiscordAPIError[50035]"}}',
				},
			],
			matched: 1,
			held: 40,
		});

		const feed = (await (await appFor().request(`/analytics/logs?run=${PAST}&level=error&q=clear`)).json()) as LogFeed;

		expect(readLogLines).toHaveBeenCalledWith(PAST, { limit: 200, minRank: 50, search: "clear" });
		expect(feed).toMatchObject({ run: PAST, current: false, buffered: 40, matched: 1 });
		expect(feed.lines[0]?.context).toEqual({ err: { stack: "DiscordAPIError[50035]" } });
	});

	it("answers 404 for a run it does not hold, and 400 for an id that is not one", async () => {
		expect((await appFor().request(`/analytics/logs?run=${PAST}`)).status).toBe(404);
		expect((await appFor().request("/analytics/logs?run=..%2Fusers")).status).toBe(400);
	});

	/** The run in memory is always there, so the screen still works while the database is what is wrong. */
	it("lists this run first, and only this one while the database cannot be read", async () => {
		logRing.push({ at: Date.now(), level: "error", message: "boom", context: {} });
		jest.mocked(listLogRuns).mockResolvedValueOnce([
			{
				run: PAST,
				startedAt: new Date(0),
				endedAt: null,
				lastAt: null,
				version: "2.4.0",
				lines: 3,
				errors: 1,
				warnings: 0,
				matched: null,
			},
		]);

		const listed = (await (await appFor().request("/analytics/logs/runs")).json()) as LogRuns;
		jest.mocked(listLogRuns).mockRejectedValueOnce(new Error("down"));
		const alone = (await (await appFor().request("/analytics/logs/runs")).json()) as LogRuns;

		expect(listed.runs.map((run) => [run.id, run.current])).toEqual([
			[logRing.run.id, true],
			[PAST, false],
		]);
		expect(listed.runs[0]?.errors).toBe(1);
		expect(alone).toMatchObject({ pastUnavailable: true, runs: [{ id: logRing.run.id }] });
	});

	/** A reference from an old failure is in some run, and the list says which before anybody opens one. */
	it("counts what a search finds in every run, at the level chosen", async () => {
		logRing.push({ at: Date.now(), level: "error", message: "[COMMAND_ERROR] DXQV6Z", context: {} });
		logRing.push({ at: Date.now(), level: "info", message: "ran DXQV6Z", context: {} });
		jest.mocked(listLogRuns).mockResolvedValueOnce([]);

		const runs = (await (await appFor().request("/analytics/logs/runs?level=error&q=dxqv6z")).json()) as LogRuns;

		expect(listLogRuns).toHaveBeenCalledWith({ minRank: 50, text: "dxqv6z" });
		expect(runs.runs[0]?.matched).toBe(1);
	});
});

describe("the runtime card", () => {
	/** A bot that phones home on a timer is not something to ship by default, so it links instead. */
	it("links the repository rather than checking for a release", async () => {
		const info = (await (await appFor().request("/analytics/runtime")).json()) as RuntimeInfo;

		expect(info.repositoryUrl).toContain("github.com");
	});
});
