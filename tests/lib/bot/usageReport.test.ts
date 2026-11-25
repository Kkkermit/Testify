import { Collection } from "discord.js";
import { type Env } from "@config/env";
import { settingsTarget, type TestifyClient } from "@core/client";
import {
	earlierDashboardViews,
	earlierUses,
	type EarlierTally,
	type EarlierUses,
} from "@database/repositories/earlierUsageRepository";
import { AnalyticsUnavailable } from "@lib/bot/shardlensReader.util";
import {
	commandReport,
	dailyOf,
	guildActivity,
	guildUsageReport,
	oneGuildActivity,
	orUnavailable,
	usageReport,
} from "@lib/bot/usageReport.util";

const KEY = `slk_read_${"r".repeat(43)}`;
const HERE = "900000000000000001";
const THERE = "900000000000000002";
const GONE = "900000000000000009";
const NOW = Date.parse("2026-11-15T12:00:00.000Z");

type Spec = Record<string, unknown> & { kind: string };

const NONE: EarlierUses = { byDay: [], byCommand: [], byGuild: [], bySurface: [] };
let mockEarlier: { uses: EarlierUses | Error; screens: EarlierTally[]; views: EarlierTally[] } = {
	uses: NONE,
	screens: [],
	views: [],
};
jest.mock("@database/repositories/earlierUsageRepository", () => ({
	NO_EARLIER_USES: { byDay: [], byCommand: [], byGuild: [], bySurface: [] },
	earlierUses: jest.fn(async () =>
		mockEarlier.uses instanceof Error ? Promise.reject(mockEarlier.uses) : mockEarlier.uses,
	),
	earlierScreenViews: jest.fn(() => Promise.resolve(mockEarlier.screens)),
	earlierDashboardViews: jest.fn(() => Promise.resolve(mockEarlier.views)),
}));

const tally = (key: string, count: number, failures = 0): EarlierTally => ({ key, count, failures });

// `restoreMocks` undoes a spy before every test, so each test makes its own.
let fetchMock: jest.SpiedFunction<typeof fetch>;
let asked: Spec[] = [];

/** A collector answering each query by its shape, the way `/v1/query` does. */
function collector(answer: (spec: Spec) => unknown): void {
	asked = [];
	fetchMock.mockImplementation((_url, init) => {
		const spec = (typeof init?.body === "string" ? JSON.parse(init.body) : { kind: "meta" }) as Spec;
		asked.push(spec);
		const body = spec.kind === "meta" ? { rawRetentionDays: 30, mode: "audit" } : answer(spec);
		return Promise.resolve(new Response(JSON.stringify(body ?? {}), { status: 200 }));
	});
}

/** Empty answers for everything not named, in the shape each kind returns. */
function empty(spec: Spec): unknown {
	if (spec.kind === "series") return { points: [] };
	if (spec.kind === "eventProps") return { values: [] };
	if (spec.kind === "server") return { found: false };
	return { rows: [] };
}

function guild(id: string, name: string): unknown {
	return { id, name, memberCount: 10, iconURL: () => null, joinedAt: new Date("2026-01-01T00:00:00.000Z") };
}

function clientFor(): TestifyClient {
	const env = { SHARDLENS_URL: "https://stats.example.com/v1/ingest", SHARDLENS_READ_KEY: KEY } as unknown as Env;
	return {
		env,
		logger: { debug: jest.fn() },
		lensTarget: settingsTarget(env),
		commands: new Collection<string, unknown>([
			["ban", { name: "ban", category: "moderation" }],
			["warn", { name: "warn", category: "moderation" }],
			["beg", { name: "beg", category: "economy" }],
		]),
		contextMenus: new Collection<string, unknown>([["Warn", { name: "Warn", switchedBy: "warn" }]]),
		buttons: new Collection<string, unknown>([["warnform", {}]]),
		guilds: {
			cache: new Collection<string, unknown>([
				[HERE, guild(HERE, "Here")],
				[THERE, guild(THERE, "There")],
			]),
		},
	} as unknown as TestifyClient;
}

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, "fetch");
	collector(empty);
	mockEarlier = { uses: NONE, screens: [], views: [] };
});

describe("usageReport", () => {
	/** Shardlens counts prefix runs with slash runs, so the command table is the whole of each command's figures. */
	it("ranks commands by what the collector counts, with failures from each one's error rate", async () => {
		collector((spec) => {
			if (spec.kind === "commands") {
				return {
					rows: [
						{ command: "ban", runs: 15, errorRate: 0.2, p95Ms: 900 },
						{ command: "Warn", runs: 4, errorRate: 0, p95Ms: 300 },
						{ command: "beg", runs: 0, errorRate: null, p95Ms: null },
					],
				};
			}
			return empty(spec);
		});

		const report = await usageReport(clientFor(), 7, NOW);

		expect(report.mostUsed).toEqual([
			{ command: "ban", category: "moderation", menu: false, count: 15, failures: 3 },
			// A right-click action is filed under the command it belongs to, and marked, since it has no page of its own.
			{ command: "Warn", category: "moderation", menu: true, count: 4, failures: 0 },
		]);
		expect(report.commandsUsed).toBe(2);
		expect(report.leastUsed.map((row) => [row.command, row.count])).toEqual([
			["beg", 0],
			["warn", 0],
			["ban", 15],
		]);
	});

	it("draws every day of the window, and tells the surfaces apart by what started each run", async () => {
		collector((spec) => {
			if (spec.kind === "series" && spec.metric === "interactions") {
				return {
					points: [
						{ t: "2026-11-15T00:00:00", key: "ok", value: 9 },
						{ t: "2026-11-15T00:00:00", key: "timeout", value: 1 },
						{ t: "2026-11-13T00:00:00", key: "error", value: 2 },
					],
				};
			}
			if (spec.kind === "top" && spec.groupBy === "kind") {
				return {
					rows: [
						{ key: "chat_input", value: 7 },
						{ key: "user_context", value: 2 },
						{ key: "message_command", value: 3 },
					],
				};
			}
			return empty(spec);
		});

		const report = await usageReport(clientFor(), 3, NOW);

		expect(report.daily).toEqual([
			{ day: "2026-11-13", count: 2, failures: 2 },
			{ day: "2026-11-14", count: 0, failures: 0 },
			{ day: "2026-11-15", count: 10, failures: 1 },
		]);
		expect(report).toMatchObject({ runs: 12, failures: 3, surfaces: { slash: 9, prefix: 3 } });
		// Every daily series is grouped by UTC day, as the chart labels them.
		expect(asked.filter((spec) => spec.kind === "series").every((spec) => spec.timezone === "UTC")).toBe(true);
	});

	/** A server the bot has left still has figures, and a row labelled "unknown server" is noise. */
	it("ranks servers by their runs, leaving out a server the bot is no longer in", async () => {
		collector((spec) => {
			if (spec.kind === "top" && spec.groupBy === "guild") {
				return {
					rows: [
						{ key: THERE, value: 4 },
						{ key: HERE, value: 5 },
						{ key: GONE, value: 99 },
						{ key: "", value: 7 },
					],
				};
			}
			if (spec.kind === "eventProps" && spec.name === "dashboard_server") {
				return { values: [{ value: THERE, count: 2 }] };
			}
			return empty(spec);
		});

		const report = await usageReport(clientFor(), 7, NOW);

		expect(report.busiestGuilds.map((row) => [row.name, row.count])).toEqual([
			["Here", 5],
			["There", 4],
		]);
		expect(report.dashboardGuilds.map((row) => [row.name, row.count])).toEqual([["There", 2]]);
		// Activity with no server is a direct message, and the one that left still ran commands here.
		expect(report.activeGuilds).toBe(3);
	});

	/** Only the dashboard's own routes are a screen, whatever a stray event says. */
	it("lists screens the dashboard has, and the slowest commands by their slowest one in twenty", async () => {
		collector((spec) => {
			if (spec.kind === "eventProps" && spec.name === "dashboard_screen") {
				return {
					values: [
						{ value: "/guilds/:guildId/levelling", count: 9 },
						{ value: "/nowhere", count: 5 },
					],
				};
			}
			if (spec.kind === "commands") {
				return {
					rows: [
						{ command: "beg", runs: 3, errorRate: 0, p95Ms: 120.4 },
						{ command: "ban", runs: 8, errorRate: 0, p95Ms: 2_400.6 },
						{ command: "warn", runs: 2, errorRate: 0, p95Ms: null },
					],
				};
			}
			if (spec.kind === "top" && spec.stat === "p50") return { rows: [{ key: "ban", value: 310.2 }] };
			return empty(spec);
		});

		const report = await usageReport(clientFor(), 7, NOW);

		expect(report.screens).toEqual([{ route: "/guilds/:guildId/levelling", count: 9 }]);
		expect(report.slowest).toEqual([
			{ command: "ban", category: "moderation", menu: false, runs: 8, typicalMs: 310, slowMs: 2_401 },
			{ command: "beg", category: "economy", menu: false, runs: 3, typicalMs: 120, slowMs: 120 },
		]);
	});

	/** The dashboard's figures are read from raw events, which the collector keeps less long than its rollups. */
	it("says how far back the event figures reach, and where the collector's own dashboard is", async () => {
		const report = await usageReport(clientFor(), 90, NOW);

		expect(report).toMatchObject({ days: 90, detailDays: 30, collector: "https://stats.example.com" });
		expect(JSON.stringify(report)).not.toContain("slk_");
	});
});

describe("every report", () => {
	/** Prefix runs are the SDK's own message commands, so asking about a custom event for them reads nothing. */
	it("reads commands only from the collector's own figures, never from a custom event", async () => {
		const client = clientFor();
		const here = client.guilds.cache.get(HERE) as never;
		const names: unknown[] = [];
		for (const work of [
			() => usageReport(client, 7, NOW),
			() => guildUsageReport(client, here, 7, NOW),
			() => guildActivity(client, 7, NOW),
			() => oneGuildActivity(client, HERE, 7, NOW),
		]) {
			await work();
			names.push(
				...asked.filter((spec) => spec.kind === "eventProps" || spec.metric === "custom").map((spec) => spec.name),
			);
		}

		expect(new Set(names)).toEqual(new Set(["dashboard_screen", "dashboard_server"]));
	});
});

describe("guildUsageReport", () => {
	/** Every question is narrowed to the server in the path, or one server's page would show the whole bot. */
	it("asks only about that server", async () => {
		await guildUsageReport(clientFor(), clientFor().guilds.cache.get(HERE) as never, 30, NOW);

		const filtered = asked.filter((spec) => spec.metric === "interactions");
		const props = asked.filter((spec) => spec.kind === "eventProps");
		expect(filtered).toHaveLength(4);
		for (const spec of filtered) {
			expect(spec.filters).toEqual(expect.arrayContaining([{ field: "guild", op: "eq", value: HERE }]));
		}
		expect(props.map((spec) => spec.prop)).toEqual([`in_${HERE}`]);
		expect(asked).toContainEqual({ kind: "server", guild: HERE });
	});

	/** The collector stores permission bits, which mean nothing to an owner until Discord's own names are put on them. */
	it("names the permissions the collector says the bot lacks there, with the server's history", async () => {
		collector((spec) =>
			spec.kind === "server"
				? {
						found: true,
						uniqueUsersThisPeriod: null,
						profile: { sizeAtJoin: 40, firstCommandAt: "2026-01-01T00:05:00.000Z", lastCommandAt: null },
						events: [{ ts: "2026-01-01T00:00:00.000Z", kind: "join", detectedAtStartup: true }],
						missingPermissions: String(1n << 28n),
					}
				: empty(spec),
		);

		const report = await guildUsageReport(clientFor(), clientFor().guilds.cache.get(HERE) as never, 30, NOW);

		expect(report.profile).toEqual({
			sizeAtJoin: 40,
			firstCommandAt: "2026-01-01T00:05:00.000Z",
			lastCommandAt: null,
			missingPermissions: ["ManageRoles"],
			history: [{ at: "2026-01-01T00:00:00.000Z", kind: "join", atStartup: true }],
		});
	});

	it("has no profile of a server the collector has never seen", async () => {
		const report = await guildUsageReport(clientFor(), clientFor().guilds.cache.get(HERE) as never, 30, NOW);

		expect(report.profile).toBeNull();
	});

	it("counts each command and both surfaces there, and names how many people used it", async () => {
		collector((spec) => {
			const filters = Array.isArray(spec.filters) ? spec.filters : [];
			if (spec.kind === "top" && spec.groupBy === "kind") {
				return {
					rows: [
						{ key: "chat_input", value: 6 },
						{ key: "message_command", value: 2 },
					],
				};
			}
			if (spec.kind === "top" && filters.length === 2) return { rows: [{ key: "ban", value: 1 }] };
			if (spec.kind === "top") {
				return {
					rows: [
						{ key: "ban", value: 6 },
						{ key: "beg", value: 2 },
					],
				};
			}
			if (spec.kind === "series") return { points: [{ t: "2026-11-15T00:00:00", key: "ok", value: 8 }] };
			if (spec.kind === "eventProps" && spec.name === "dashboard_server") {
				return { values: [{ value: "/guilds/:guildId", count: 4 }] };
			}
			if (spec.kind === "server") return { found: true, uniqueUsersThisPeriod: 7 };
			return empty(spec);
		});

		const report = await guildUsageReport(clientFor(), clientFor().guilds.cache.get(HERE) as never, 30, NOW);

		expect(report.commands.map((row) => [row.command, row.count, row.failures])).toEqual([
			["ban", 6, 1],
			["beg", 2, 0],
		]);
		expect(report).toMatchObject({
			runs: 8,
			failures: 1,
			surfaces: { slash: 6, prefix: 2 },
			dashboardViews: 4,
			people: 7,
		});
		// Prefix runs carry their server, so a server's chart counts both surfaces.
		expect(report.daily).toHaveLength(30);
		expect(report.daily.at(-1)).toEqual({ day: "2026-11-15", count: 8, failures: 0 });
	});
});

describe("commandReport", () => {
	const detail = {
		from: "2026-11-09T00:00:00.000Z",
		totals: {
			runs: 10,
			ok: 7,
			error: 1,
			timeout: 1,
			noResponse: 1,
			deferRate: 0.5,
			ephemeralRate: null,
			premiumShare: null,
			over3sRate: 0.1,
			handlerP95Ms: 300,
			firstSeen: "2026-11-09T10:00:00.000Z",
			lastSeen: "2026-11-15T11:00:00.000Z",
		},
		latencyHistogram: [0, 3, 7],
		kinds: [{ key: "chat_input", value: 10 }],
		subcommands: [{ key: "create", value: 10 }],
		options: [{ key: "reason", value: 4 }],
		optionValues: [{ option: "duration", value: "1h", runs: 2 }],
		memberTiers: [{ key: "manager", value: 10 }],
		installs: [{ key: "guild", value: 10 }],
		contexts: [{ key: "0", value: 10 }],
		channelTypes: [{ key: "0", value: 10 }],
		locales: [{ key: "en-GB", value: 10 }],
		topServers: [
			{ key: HERE, value: 8, name: "Here", icon: null },
			{ key: GONE, value: 2, name: "Gone", icon: null },
		],
		components: [
			{ key: "warnform:submit:*", kind: "modal_submit", value: 3 },
			{ key: "somebody:typed words", kind: "button", value: 9 },
		],
		modals: [
			{ customId: "warnform:open:*", shown: 5, submitted: 0 },
			{ customId: "warnform:submit:*", shown: 0, submitted: 3 },
		],
	};

	/** One command's page must never quietly show the whole bot's figures. */
	it("asks about that command alone, for its breakdowns and its days", async () => {
		collector((spec) => (spec.kind === "command" ? detail : empty(spec)));
		await commandReport(clientFor(), "warn", 7, NOW);

		expect(asked).toContainEqual(expect.objectContaining({ kind: "command", name: "warn" }));
		expect(asked.find((spec) => spec.kind === "series")).toMatchObject({
			groupBy: "outcome",
			filters: [{ field: "command", op: "eq", value: "warn" }],
		});
	});

	it("keeps only the bot's own handlers and the servers it is still in", async () => {
		collector((spec) => (spec.kind === "command" ? detail : empty(spec)));

		const report = await commandReport(clientFor(), "warn", 7, NOW);

		expect(report).toMatchObject({
			command: "warn",
			category: "moderation",
			totals: { runs: 10, ok: 7, errors: 1, late: 1, noResponse: 1, ephemeralRate: null },
			latency: [0, 3, 7],
			tiers: [{ key: "manager", count: 10 }],
		});
		expect(report.servers.map((row) => row.guildId)).toEqual([HERE]);
		expect(report.components).toEqual([{ handler: "warnform:submit", kind: "modal_submit", count: 3 }]);
		expect(report.forms).toEqual([{ id: "warnform", shown: 5, submitted: 3 }]);
		expect(JSON.stringify(report)).not.toContain("typed words");
	});
});

describe("guildActivity and oneGuildActivity", () => {
	it("count commands on both surfaces and dashboard use, per server", async () => {
		collector((spec) => {
			if (spec.kind === "top" && spec.groupBy === "guild") return { rows: [{ key: HERE, value: 5 }] };
			if (spec.kind === "top")
				return {
					rows: [
						{ key: "ok", value: 3 },
						{ key: "error", value: 1 },
					],
				};
			if (spec.kind === "eventProps" && spec.name === "dashboard_server")
				return { values: [{ value: HERE, count: 6 }] };
			return empty(spec);
		});

		const all = await guildActivity(clientFor(), 30, NOW);
		const one = await oneGuildActivity(clientFor(), HERE, 30, NOW);

		expect([all.commands.get(HERE), all.dashboard.get(HERE)]).toEqual([5, 6]);
		expect(one).toEqual({ commands: 4, dashboard: 6 });
	});
});

describe("the counts from before Shardlens", () => {
	const BEFORE: EarlierUses = {
		byDay: [tally("2026-11-14", 7, 1)],
		byCommand: [tally("ban", 5, 1), tally("beg", 2)],
		byGuild: [tally(HERE, 4, 1), tally("DIRECT_MESSAGE", 3)],
		bySurface: [tally("slash", 5, 1), tally("prefix", 2)],
	};

	function shardlensCounts(spec: Spec): unknown {
		if (spec.kind === "commands") return { rows: [{ command: "ban", runs: 15, errorRate: 0.2, p95Ms: 900 }] };
		if (spec.kind === "top" && spec.groupBy === "kind") return { rows: [{ key: "chat_input", value: 15 }] };
		if (spec.kind === "top" && spec.groupBy === "guild") return { rows: [{ key: THERE, value: 15 }] };
		if (spec.kind === "eventProps" && spec.name === "dashboard_screen") {
			return { values: [{ value: "/guilds/:guildId/levelling", count: 9 }] };
		}
		return empty(spec);
	}

	/** Production counted every run itself before Shardlens, and an upgrade must not empty the console of it. */
	it("adds what the bot counted itself to every figure, from the first day of the window", async () => {
		mockEarlier = {
			uses: BEFORE,
			screens: [tally("/guilds/:guildId/settings", 20), tally("/guilds/:guildId/levelling", 3)],
			views: [tally(THERE, 6)],
		};
		collector(shardlensCounts);

		const report = await usageReport(clientFor(), 7, NOW);

		expect(jest.mocked(earlierUses)).toHaveBeenCalledWith("2026-11-09");
		expect(report.mostUsed.map((row) => [row.command, row.count, row.failures])).toEqual([
			["ban", 20, 4],
			["beg", 2, 0],
		]);
		expect(report.daily.find((day) => day.day === "2026-11-14")).toEqual({ day: "2026-11-14", count: 7, failures: 1 });
		expect(report.surfaces).toEqual({ slash: 20, prefix: 2 });
		expect(report.runs).toBe(22);
		expect(report.countedBefore).toBe(7);
		// A run outside any server was counted under a key that is not a server, and stays out of the servers.
		expect(report.busiestGuilds.map((row) => [row.guildId, row.count])).toEqual([
			[THERE, 15],
			[HERE, 4],
		]);
		expect(report.activeGuilds).toBe(2);
		expect(report.dashboardGuilds.map((row) => [row.guildId, row.count])).toEqual([[THERE, 6]]);
		expect(report.screens).toEqual([
			{ route: "/guilds/:guildId/settings", count: 20 },
			{ route: "/guilds/:guildId/levelling", count: 12 },
		]);
	});

	it("adds them to one server's figures, and asks only about that server", async () => {
		mockEarlier = { uses: { ...BEFORE, byCommand: [tally("ban", 4, 1)] }, screens: [], views: [tally(HERE, 2)] };
		collector((spec) => {
			if (spec.kind === "top" && spec.groupBy === "command" && spec.filters !== undefined) {
				const failed = (spec.filters as { field: string }[]).some((filter) => filter.field === "outcome");
				return { rows: [{ key: "ban", value: failed ? 1 : 6 }] };
			}
			if (spec.kind === "top" && spec.groupBy === "kind") return { rows: [{ key: "chat_input", value: 6 }] };
			return empty(spec);
		});

		const report = await guildUsageReport(clientFor(), clientFor().guilds.cache.get(HERE) as never, 7, NOW);

		expect(jest.mocked(earlierUses)).toHaveBeenCalledWith("2026-11-09", HERE);
		expect(jest.mocked(earlierDashboardViews)).toHaveBeenCalledWith("2026-11-09", HERE);
		expect(report.commands.map((row) => [row.command, row.count, row.failures])).toEqual([["ban", 10, 2]]);
		expect(report.runs).toBe(13);
		expect(report.dashboardViews).toBe(2);
		expect(report.countedBefore).toBe(7);
	});

	it("adds them to the server list's counts", async () => {
		mockEarlier = { uses: BEFORE, screens: [], views: [tally(HERE, 2)] };
		collector(empty);

		const all = await guildActivity(clientFor(), 30, NOW);
		const one = await oneGuildActivity(clientFor(), HERE, 30, NOW);

		expect([all.commands.get(HERE), all.commands.has("DIRECT_MESSAGE"), all.dashboard.get(HERE)]).toEqual([
			4,
			false,
			2,
		]);
		expect(one).toEqual({ commands: 7, dashboard: 2 });
	});

	/** They are history: one that cannot be read costs its share of a figure, never the page. */
	it("leaves them out, quietly, when they cannot be read", async () => {
		mockEarlier = { uses: new Error("database down"), screens: [], views: [] };
		collector(shardlensCounts);
		const client = clientFor();

		const report = await usageReport(client, 7, NOW);

		expect(report.runs).toBe(15);
		expect(report.countedBefore).toBe(0);
		expect(client.logger.debug).toHaveBeenCalled();
	});
});

describe("orUnavailable", () => {
	it("turns Shardlens being away into a reason, and lets any other failure through", async () => {
		expect(await orUnavailable(Promise.reject(new AnalyticsUnavailable("refused")))).toEqual({
			value: null,
			problem: "refused",
		});
		await expect(orUnavailable(Promise.reject(new Error("bug")))).rejects.toThrow("bug");
	});
});

describe("dailyOf", () => {
	it("ignores a point outside the window rather than adding a day", () => {
		const days = dailyOf(2, NOW, [{ t: "2026-10-01T00:00:00", key: "ok", value: 5 }]);

		expect(days.map((day) => day.count)).toEqual([0, 0]);
	});
});
