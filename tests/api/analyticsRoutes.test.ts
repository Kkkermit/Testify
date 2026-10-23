import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { analytics, zeroFill } from "@api/routes/analytics";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { logRing } from "@core/logRing";
import { activeMembers, memberTallies, recentRuns, slowestCommands } from "@database/repositories/commandRunRepository";
import {
	commandTallies,
	dailyTallies,
	dashboardTallies,
	guildTallies,
	surfaceTallies,
	usageTotals,
} from "@database/repositories/usageRepository";
import {
	type CommandRunRow,
	type GuildUsageReport,
	type LogFeed,
	type MemberUsageRow,
	type Paged,
	type RuntimeInfo,
	type UsageReport,
} from "@testify/shared";

jest.mock("@database/repositories/usageRepository", () => ({
	usageTotals: jest.fn(() => Promise.resolve({ runs: 0, failures: 0, activeGuilds: 0, commandsUsed: 0 })),
	commandTallies: jest.fn(() => Promise.resolve([])),
	guildTallies: jest.fn(() => Promise.resolve([])),
	dailyTallies: jest.fn(() => Promise.resolve([])),
	surfaceTallies: jest.fn(() => Promise.resolve({ slash: 0, prefix: 0 })),
	screenTallies: jest.fn(() => Promise.resolve([])),
	dashboardTallies: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/commandRunRepository", () => ({
	activeMembers: jest.fn(() => Promise.resolve(0)),
	memberTallies: jest.fn(() => Promise.resolve([])),
	recentRuns: jest.fn(() => Promise.resolve({ items: [], total: 0 })),
	slowestCommands: jest.fn(() => Promise.resolve([])),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const GUILD = "900000000000000001";
const ALICE = "800000000000000001";
const BOB = "800000000000000002";
const CHANNEL = "700000000000000001";

const totals = jest.mocked(usageTotals);
const byCommand = jest.mocked(commandTallies);
const byGuild = jest.mocked(guildTallies);
const byDay = jest.mocked(dailyTallies);
const bySurface = jest.mocked(surfaceTallies);
const byDashboard = jest.mocked(dashboardTallies);
const members = jest.mocked(memberTallies);
const runs = jest.mocked(recentRuns);

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
			["ban", { name: "ban", category: "moderation" }],
			["rank", { name: "rank", category: "levelling" }],
			["beg", { name: "beg", category: "economy" }],
		]),
		isOwner: (id: string) => id === OWNER,
		eventNames: () => ["ready", "interactionCreate"],
		startedAt: Date.now() - 60_000,
		users: {
			cache: new Collection<string, unknown>([[ALICE, { displayAvatarURL: () => "https://cdn.example/alice.png" }]]),
		},
		channels: { cache: new Collection<string, unknown>() },
		ws: { ping: 42, shards: new Collection<string, unknown>() },
		env: { NODE_ENV: "test", LOG_LEVEL: "warn" } as Env,
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
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

async function usage(query = ""): Promise<UsageReport> {
	return (await (await appFor().request(`/analytics/usage${query}`)).json()) as UsageReport;
}

beforeEach(() => {
	jest.clearAllMocks();
	totals.mockResolvedValue({ runs: 0, failures: 0, activeGuilds: 0, commandsUsed: 0 });
	byCommand.mockResolvedValue([]);
	byGuild.mockResolvedValue([]);
	byDay.mockResolvedValue([]);
	bySurface.mockResolvedValue({ slash: 0, prefix: 0 });
	byDashboard.mockResolvedValue([]);
	members.mockResolvedValue([]);
	runs.mockResolvedValue({ items: [], total: 0 });
	jest.mocked(activeMembers).mockResolvedValue(0);
	jest.mocked(slowestCommands).mockResolvedValue([]);
	logRing.clear();
});

const SERVER_PATHS = [
	`/analytics/guilds/${GUILD}`,
	`/analytics/guilds/${GUILD}/members`,
	`/analytics/guilds/${GUILD}/runs`,
];

describe("who can read the analytics", () => {
	/** These name every server the bot is in and how much each is used — owner-only, like the rest of it. */
	it.each(["/analytics/usage", "/analytics/logs", "/analytics/runtime", ...SERVER_PATHS])(
		"hides %s from a manager",
		async (path) => {
			expect((await appFor(MANAGER).request(path)).status).toBe(404);
		},
	);

	it.each(["/analytics/usage", "/analytics/logs", "/analytics/runtime"])("serves %s to the owner", async (path) => {
		expect((await appFor().request(path)).status).toBe(200);
	});
});

describe("the usage report", () => {
	it("totals the window", async () => {
		totals.mockResolvedValue({ runs: 120, failures: 3, activeGuilds: 4, commandsUsed: 9 });

		expect(await usage()).toMatchObject({ runs: 120, failures: 3, activeGuilds: 4, commandsUsed: 9, days: 30 });
	});

	it("takes the window from the query, and refuses one it does not support", async () => {
		expect((await usage("?days=7")).days).toBe(7);
		expect((await appFor().request("/analytics/usage?days=365")).status).toBe(400);
	});

	it("names each command's category, so the list is readable without a lookup", async () => {
		byCommand.mockResolvedValue([{ command: "ban", count: 10, failures: 1 }]);

		expect((await usage()).mostUsed).toEqual([{ command: "ban", category: "moderation", count: 10, failures: 1 }]);
	});

	/** A command nobody has run has no usage row, and still ranks as least used. */
	it("ranks a never-used command below one that ran once", async () => {
		byCommand.mockResolvedValue([{ command: "ban", count: 1, failures: 0 }]);

		const least = (await usage()).leastUsed;

		expect(least.map((row) => row.command)).toEqual(["beg", "rank", "ban"]);
		expect(least[0]).toMatchObject({ count: 0, category: "economy" });
	});

	it("says how many commands exist as well as how many were used", async () => {
		totals.mockResolvedValue({ runs: 5, failures: 0, activeGuilds: 1, commandsUsed: 1 });

		expect(await usage()).toMatchObject({ commandsUsed: 1, commandsTotal: 3 });
	});

	it("names the busiest servers", async () => {
		byGuild.mockResolvedValue([{ guildId: GUILD, count: 42 }]);

		expect((await usage()).busiestGuilds).toEqual([
			{ guildId: GUILD, name: "Test Server", iconUrl: null, memberCount: 1_234, count: 42 },
		]);
	});

	/** Rows outlive the bot's membership, and a row labelled "unknown server" is noise rather than information. */
	it("drops a server the bot has since left", async () => {
		byGuild.mockResolvedValue([{ guildId: "900000000000000009", count: 42 }]);

		expect((await usage()).busiestGuilds).toEqual([]);
	});

	it("names the servers whose managers open the dashboard most", async () => {
		byDashboard.mockResolvedValue([
			{ guildId: GUILD, count: 12, lastDay: "2026-08-01" },
			{ guildId: "900000000000000009", count: 50, lastDay: "2026-08-01" },
		]);

		expect((await usage()).dashboardGuilds).toEqual([
			{ guildId: GUILD, name: "Test Server", iconUrl: null, memberCount: 1_234, count: 12 },
		]);
		expect(byDashboard).toHaveBeenCalledWith(30, 10);
	});

	it("names the slowest commands with their category, measured over the runs that are kept", async () => {
		jest.mocked(slowestCommands).mockResolvedValue([{ command: "ban", runs: 12, typicalMs: 80, slowMs: 2_400 }]);

		const report = await usage("?days=90");

		expect(report.slowest).toEqual([
			{ command: "ban", category: "moderation", runs: 12, typicalMs: 80, slowMs: 2_400 },
		]);
		expect(report.runDays).toBe(30);
		expect(slowestCommands).toHaveBeenCalledWith(30, 10);
	});

	it("reports the split between slash and prefix", async () => {
		bySurface.mockResolvedValue({ slash: 90, prefix: 10 });

		expect((await usage()).surfaces).toEqual({ slash: 90, prefix: 10 });
	});

	it("returns one entry per day in the window", async () => {
		expect((await usage("?days=7")).daily).toHaveLength(7);
	});
});

describe("one server's usage", () => {
	async function report(query = ""): Promise<GuildUsageReport> {
		return (await (await appFor().request(`/analytics/guilds/${GUILD}${query}`)).json()) as GuildUsageReport;
	}

	it("totals that server's commands and names who ran them", async () => {
		byCommand.mockResolvedValue([
			{ command: "rank", count: 8, failures: 1 },
			{ command: "ban", count: 2, failures: 0 },
		]);
		bySurface.mockResolvedValue({ slash: 7, prefix: 3 });
		byDashboard.mockResolvedValue([{ guildId: GUILD, count: 5, lastDay: "2026-08-01" }]);
		jest.mocked(activeMembers).mockResolvedValue(4);

		const body = await report("?days=7");

		expect(body).toMatchObject({
			days: 7,
			memberDays: 7,
			runs: 10,
			failures: 1,
			surfaces: { slash: 7, prefix: 3 },
			dashboardViews: 5,
			members: 4,
			guild: { guildId: GUILD, name: "Test Server", joinedAt: "2026-01-01T00:00:00.000Z" },
		});
		expect(body.commands.map((row) => [row.command, row.category])).toEqual([
			["rank", "levelling"],
			["ban", "moderation"],
		]);
		expect(body.daily).toHaveLength(7);
	});

	/** Every query is narrowed to the server in the path, or one server's drill-down would show the whole bot. */
	it("asks for that server's rows and no other's", async () => {
		await report();

		expect(byCommand).toHaveBeenCalledWith(30, 0, undefined, GUILD);
		expect(byDay).toHaveBeenCalledWith(30, undefined, GUILD);
		expect(bySurface).toHaveBeenCalledWith(30, undefined, GUILD);
		expect(byDashboard).toHaveBeenCalledWith(30, 0, undefined, GUILD);
		expect(activeMembers).toHaveBeenCalledWith(GUILD, 30);
	});

	/** Who ran what is kept for 30 days, so a 90-day window says its member figures cover less. */
	it("caps the member figures at what is kept", async () => {
		expect((await report("?days=90")).memberDays).toBe(30);
		expect(activeMembers).toHaveBeenCalledWith(GUILD, 30);
	});

	it("is a 404 for a server the bot is not in, and a 400 for something that is not an ID", async () => {
		expect((await appFor().request("/analytics/guilds/900000000000000009")).status).toBe(404);
		expect((await appFor().request("/analytics/guilds/nope")).status).toBe(400);
	});
});

describe("who ran what in one server", () => {
	const alice = {
		userId: ALICE,
		username: "alice",
		runs: 6,
		failures: 1,
		prefix: 2,
		commands: [
			{ command: "rank", count: 3 },
			{ command: "balance", count: 2 },
			{ command: "beg", count: 1 },
			{ command: "ban", count: 1 },
		],
		lastAt: new Date("2026-08-01T12:00:00.000Z"),
	};
	const bob = { ...alice, userId: BOB, username: "bob", runs: 1, commands: [{ command: "beg", count: 1 }] };

	async function people(query = ""): Promise<Paged<MemberUsageRow>> {
		return (await (
			await appFor().request(`/analytics/guilds/${GUILD}/members${query}`)
		).json()) as Paged<MemberUsageRow>;
	}

	it("lists each member with their busiest three commands and their picture when it is cached", async () => {
		members.mockResolvedValue([alice, bob]);

		const body = await people();

		expect(body.total).toBe(2);
		expect(body.items[0]).toEqual({
			userId: ALICE,
			username: "alice",
			avatarUrl: "https://cdn.example/alice.png",
			runs: 6,
			failures: 1,
			prefix: 2,
			commandCount: 4,
			topCommands: alice.commands.slice(0, 3),
			lastAt: "2026-08-01T12:00:00.000Z",
		});
		expect(body.items[1]?.avatarUrl).toBeNull();
	});

	it("finds a member by name or by a pasted mention", async () => {
		members.mockResolvedValue([alice, bob]);

		expect((await people("?q=BO")).items.map((row) => row.username)).toEqual(["bob"]);
		expect((await people(`?q=%3C%40${ALICE}%3E`)).items.map((row) => row.username)).toEqual(["alice"]);
	});

	it("pages the members", async () => {
		members.mockResolvedValue([alice, bob]);

		const body = await people("?page=2&perPage=1");

		expect(body).toMatchObject({ total: 2, page: 2, perPage: 1 });
		expect(body.items.map((row) => row.username)).toEqual(["bob"]);
	});

	it("lists runs with the channel's name, and passes the filters through", async () => {
		runs.mockResolvedValue({
			items: [
				{
					guildId: GUILD,
					channelId: CHANNEL,
					userId: ALICE,
					username: "alice",
					command: "music",
					subcommand: "play",
					surface: "slash",
					failed: true,
					reference: "AB12CD",
					durationMs: 120,
					at: new Date("2026-08-01T12:00:00.000Z"),
					expiresAt: new Date("2026-08-31T12:00:00.000Z"),
				},
			],
			total: 1,
		});

		const response = await appFor().request(`/analytics/guilds/${GUILD}/runs?userId=${ALICE}&command=music&page=2`);
		const body = (await response.json()) as Paged<CommandRunRow>;

		expect(body.items).toEqual([
			{
				at: "2026-08-01T12:00:00.000Z",
				userId: ALICE,
				username: "alice",
				command: "music",
				subcommand: "play",
				surface: "slash",
				failed: true,
				reference: "AB12CD",
				durationMs: 120,
				channelId: CHANNEL,
				channelName: "general",
			},
		]);
		expect(runs).toHaveBeenCalledWith(GUILD, 30, { userId: ALICE, command: "music" }, { skip: 25, limit: 25 });
	});

	it("refuses a filter that is not an ID or a command name", async () => {
		expect((await appFor().request(`/analytics/guilds/${GUILD}/runs?userId=alice`)).status).toBe(400);
		expect((await appFor().request(`/analytics/guilds/${GUILD}/runs?command=%24where`)).status).toBe(400);
	});
});

describe("zeroFill", () => {
	const now = new Date("2026-08-01T12:00:00.000Z");

	/** A chart with holes reads as missing data rather than as a quiet day. */
	it("fills a day with no activity with a zero", () => {
		const filled = zeroFill([{ day: "2026-08-01", count: 5, failures: 1 }], 3, now);

		expect(filled).toEqual([
			{ day: "2026-07-30", count: 0, failures: 0 },
			{ day: "2026-07-31", count: 0, failures: 0 },
			{ day: "2026-08-01", count: 5, failures: 1 },
		]);
	});

	it("ends on today, oldest first", () => {
		const filled = zeroFill([], 30, now);

		expect(filled).toHaveLength(30);
		expect(filled[0]?.day).toBe("2026-07-03");
		expect(filled.at(-1)?.day).toBe("2026-08-01");
	});
});

describe("the log feed", () => {
	it("returns the buffered lines, newest first", async () => {
		logRing.push({ at: Date.now(), level: "info", message: "started", context: {} });
		logRing.push({ at: Date.now(), level: "error", message: "broke", context: { guildId: GUILD } });

		const feed = (await (await appFor().request("/analytics/logs")).json()) as LogFeed;

		expect(feed.lines.map((line) => line.message)).toEqual(["broke", "started"]);
		expect(feed.buffered).toBe(2);
	});

	it("filters by level", async () => {
		logRing.push({ at: Date.now(), level: "info", message: "chatter", context: {} });
		logRing.push({ at: Date.now(), level: "error", message: "broke", context: {} });

		const feed = (await (await appFor().request("/analytics/logs?level=error")).json()) as LogFeed;

		expect(feed.lines.map((line) => line.message)).toEqual(["broke"]);
	});

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

	/** Every level now, so a debug line put in the buffer can actually be got back out of it. */
	it("serves debug and trace", async () => {
		logRing.push({ at: Date.now(), level: "debug", message: "fine detail", context: {} });

		const feed = (await (await appFor().request("/analytics/logs?level=trace")).json()) as LogFeed;

		expect(feed.lines.map((line) => line.message)).toContain("fine detail");
	});

	it("searches the message and the context", async () => {
		logRing.push({ at: Date.now(), level: "info", message: "[READY] online", context: {} });
		logRing.push({ at: Date.now(), level: "error", message: "[BAN] failed", context: { guildId: GUILD } });

		const byMessage = (await (await appFor().request("/analytics/logs?q=ready")).json()) as LogFeed;
		const byContext = (await (await appFor().request(`/analytics/logs?q=${GUILD}`)).json()) as LogFeed;

		expect(byMessage.lines.map((line) => line.message)).toEqual(["[READY] online"]);
		expect(byContext.lines.map((line) => line.message)).toEqual(["[BAN] failed"]);
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
});

describe("the runtime card", () => {
	it("reports what the bot is running as", async () => {
		const info = (await (await appFor().request("/analytics/runtime")).json()) as RuntimeInfo;

		expect(info).toMatchObject({ nodeVersion: process.version, environment: "test", commands: 3, guilds: 1 });
		expect(info.version).toMatch(/^\d+\.\d+\.\d+/);
		expect(info.uptimeMs).toBeGreaterThan(0);
	});

	/** A bot that phones home on a timer is not something to ship by default, so it links instead. */
	it("links the repository rather than checking for a release", async () => {
		const info = (await (await appFor().request("/analytics/runtime")).json()) as RuntimeInfo;

		expect(info.repositoryUrl).toContain("github.com");
	});

	it("carries nothing from the environment beyond the mode", async () => {
		const body = await (await appFor().request("/analytics/runtime")).text();

		for (const key of ["TOKEN", "SECRET", "MONGODB", "CLIENT_ID"]) expect(body).not.toContain(key);
	});
});
