import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import {
	audienceReport,
	botActivityReport,
	funnelReport,
	growthReport,
	panelsReport,
	reliabilityReport,
	retentionReport,
} from "@lib/bot/usageSections.util";

const KEY = `slk_read_${"r".repeat(43)}`;
const NOW = Date.parse("2026-11-15T12:00:00.000Z");

type Spec = Record<string, unknown> & { kind: string };

let fetchMock: jest.SpiedFunction<typeof fetch>;
let asked: Spec[] = [];

function collector(answer: (spec: Spec) => unknown): void {
	asked = [];
	fetchMock.mockImplementation((_url, init) => {
		const spec = (typeof init?.body === "string" ? JSON.parse(init.body) : { kind: "meta" }) as Spec;
		asked.push(spec);
		const body = spec.kind === "meta" ? { rawRetentionDays: 7, mode: "audit" } : answer(spec);
		return Promise.resolve(new Response(JSON.stringify(body ?? {}), { status: 200 }));
	});
}

const points = (rows: [string, string | null, number][]): unknown => ({
	points: rows.map(([t, key, value]) => ({ t, key, value })),
});

function clientFor(): TestifyClient {
	return {
		env: { SHARDLENS_URL: "https://stats.example.com", SHARDLENS_READ_KEY: KEY },
		commands: new Collection(),
		buttons: new Collection<string, unknown>([
			["shop", {}],
			["deletemydata", {}],
		]),
		guilds: {
			cache: new Collection<string, unknown>([
				["1", { preferredLocale: "de" }],
				["2", { preferredLocale: "de" }],
				["3", { preferredLocale: "en-GB" }],
			]),
		},
	} as unknown as TestifyClient;
}

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, "fetch");
});

describe("audienceReport", () => {
	it("fills every day, reads the servers' languages from Discord and the hours in the reader's zone", async () => {
		collector((spec) =>
			spec.kind === "heatmap"
				? {
						cells: [
							{ weekday: 1, hour: 9, value: 4 },
							{ weekday: 2, hour: 3, value: 0 },
						],
					}
				: {
						daily: [{ day: "2026-11-14", users: 5, newUsers: 2 }],
						stickiness: null,
						splits: {
							locale: [
								{ key: "fr", value: 3 },
								{ key: null, value: 9 },
							],
							tier: [{ key: "member", value: 8 }],
						},
					},
		);

		const report = await audienceReport(clientFor(), 7, "Europe/Paris", NOW);

		expect(report.daily).toHaveLength(7);
		expect(report.daily.at(-2)).toEqual({ day: "2026-11-14", users: 5, newUsers: 2 });
		expect(report.daily.at(-1)).toEqual({ day: "2026-11-15", users: 0, newUsers: 0 });
		expect(report.serverLanguages).toEqual([
			{ key: "de", count: 2 },
			{ key: "en-GB", count: 1 },
		]);
		expect(report.userLanguages).toEqual([{ key: "fr", count: 3 }]);
		expect(report.contexts).toEqual([]);
		expect(report.hours).toEqual({ timezone: "Europe/Paris", cells: [{ weekday: 1, hour: 9, count: 4 }] });
		expect(asked.find((spec) => spec.kind === "heatmap")).toMatchObject({ timezone: "Europe/Paris" });
	});
});

describe("growthReport", () => {
	it("totals the window's joins and leaves and keeps every day", async () => {
		collector(() => ({
			daily: [
				{ day: "2026-11-15", joins: 2, leaves: 1 },
				{ day: "2026-10-01", joins: 50, leaves: 0 },
			],
			sizeAtInstall: [{ bucket: "1-10", servers: 2 }],
			activation: { rate: null },
			installs: { active: 3, inactive: 1 },
			lifetimes: [{ bucket: "<1d", servers: 0 }],
			serverCount: { ours: 3, discord: null, warn: false },
		}));

		const report = await growthReport(clientFor(), 7, NOW);

		expect(report).toMatchObject({ joins: 2, leaves: 1, activation: { joined: 0, activated: 0, rate: null } });
		expect(report.daily).toHaveLength(7);
		expect(report.lifetimes).toEqual([]);
		expect(report.sizeAtInstall).toEqual([{ key: "1-10", count: 2 }]);
	});
});

describe("panelsReport", () => {
	/** A custom ID can carry anything a handler packed into it, so only the bot's own handler names reach the page. */
	it("groups presses by the bot's own handlers and sums each handler's forms, leaving anything else out", async () => {
		collector((spec) => {
			const failed = (spec.filters as unknown[]).length > 0;
			if (spec.metric === "components") {
				return failed
					? { rows: [{ key: "shop:buy:*:*", value: 1 }] }
					: {
							rows: [
								{ key: "shop:buy:*:*", value: 6 },
								{ key: "shop:open:*", value: 4 },
								{ key: "someoneelse:typed words", value: 99 },
							],
						};
			}
			if (spec.metric === "modals.shown") return { rows: [{ key: "deletemydata:confirm:*", value: 5 }] };
			return { rows: [{ key: "deletemydata:erase:*", value: 2 }] };
		});

		const report = await panelsReport(clientFor(), 7, NOW);

		expect(report.buttons).toEqual([
			{
				id: "shop",
				presses: 10,
				failures: 1,
				actions: [
					{ key: "buy", count: 6 },
					{ key: "open", count: 4 },
				],
			},
		]);
		expect(report.forms).toEqual([{ id: "deletemydata", shown: 5, submitted: 2 }]);
		expect(JSON.stringify(report)).not.toContain("typed words");
	});
});

describe("botActivityReport", () => {
	it("totals each event from its own rollup and splits the music causes by service and reason", async () => {
		collector((spec) => {
			if (spec.kind === "series") {
				return spec.name === "music_played" ? points([["2026-11-14T00:00:00", null, 3]]) : points([]);
			}
			if (spec.name === "music_refused" && spec.prop === "cause") {
				return {
					values: [
						{ value: "youtube/bot-check", count: 4 },
						{ value: "broken", count: 1 },
					],
				};
			}
			if (spec.name === "command_refused" && spec.prop === "reason")
				return { values: [{ value: "cooldown", count: 2 }] };
			return { values: [] };
		});

		const report = await botActivityReport(clientFor(), 30, NOW);

		expect(report.music).toMatchObject({
			played: 3,
			skipped: 0,
			causes: [{ source: "youtube", reason: "bot-check", count: 4 }],
		});
		expect(report.refusals.reasons).toEqual([{ key: "cooldown", count: 2 }]);
		expect(report.automatic.map((row) => row.action)).toContain("raid_hold");
		expect(report.detailDays).toBe(7);
		expect(asked.find((spec) => spec.kind === "series" && spec.name === "level_up")).toMatchObject({
			metric: "custom",
		});
	});
});

describe("reliabilityReport", () => {
	it("splits each day's failures from its late answers and rounds the gateway's ping", async () => {
		collector((spec) => {
			if (spec.kind === "reliability") {
				return {
					from: "2026-11-09T00:00:00.000Z",
					totals: null,
					errorsByCode: [],
					rateLimits: [{ scope: "user", route: "/channels/:id/messages", count: 2 }],
					shards: [{ shard: 0, ping: 41.6, stale: false }],
					shardEvents: [],
				};
			}
			if (spec.kind === "gauge") return { points: [{ t: "2026-11-15T00:00:00", value: 99.4 }] };
			if (spec.metric === "rest.ratelimits") return points([["2026-11-15T00:00:00", null, 2]]);
			return points([
				["2026-11-15T00:00:00", "ok", 10],
				["2026-11-15T00:00:00", "error", 2],
				["2026-11-15T00:00:00", "timeout", 1],
				["2026-11-15T00:00:00", "no_response", 1],
			]);
		});

		const report = await reliabilityReport(clientFor(), 7, NOW);

		expect(report.daily.at(-1)).toEqual({ day: "2026-11-15", runs: 14, errors: 2, late: 2 });
		expect(report.rateLimits.daily.at(-1)).toEqual({ day: "2026-11-15", count: 2 });
		expect(report.shards.now).toEqual([{ shard: 0, pingMs: 42, stale: false }]);
		expect(report.shards.daily.at(-1)).toEqual({ day: "2026-11-15", pingMs: 99 });
		expect(report.shards.daily[0]).toEqual({ day: "2026-11-09", pingMs: null });
	});
});

describe("funnelReport and retentionReport", () => {
	/** A step is always a command, so nothing the reader typed can become a custom event name in the query. */
	it("asks about commands in the reader's zone, and about any return when none is named", async () => {
		collector((spec) =>
			spec.kind === "funnel"
				? { steps: [{ name: "ban", users: 2, medianSeconds: null }] }
				: { periods: 8, cohorts: [] },
		);
		const client = clientFor();

		await funnelReport(client, { days: 30, tz: "Asia/Tokyo", steps: ["ban", "warn"], hours: 24 }, NOW);
		await retentionReport(client, { days: 30, tz: "Asia/Tokyo", start: "ban", interval: "week" }, NOW);

		expect(asked.find((spec) => spec.kind === "funnel")).toMatchObject({
			steps: [
				{ type: "command", name: "ban" },
				{ type: "command", name: "warn" },
			],
			windowHours: 24,
			timezone: "Asia/Tokyo",
		});
		expect(asked.find((spec) => spec.kind === "retention")).toMatchObject({
			start: { type: "command", name: "ban" },
			return: "any",
			interval: "week",
		});
	});
});
