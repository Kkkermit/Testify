import { describeWithMongo } from "../helpers/mongo";
import { CommandUsages } from "@database/models/analytics.schema";
import { DashboardViews } from "@database/models/dashboardViews.schema";
import {
	commandTallies,
	dailyTallies,
	dashboardTallies,
	dayKey,
	DIRECT_MESSAGE,
	guildTallies,
	recordCommandUse,
	recordDashboardView,
	since,
	surfaceTallies,
	usageTotals,
} from "@database/repositories/usageRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const TODAY = new Date("2026-08-01T12:00:00.000Z");

describe("the day window", () => {
	it("keys a day in UTC, so a bot and its owner in different zones agree", () => {
		expect(dayKey(new Date("2026-08-01T23:30:00.000Z"))).toBe("2026-08-01");
	});

	/** Inclusive of today, so `days: 7` is this day and the six before it rather than eight days. */
	it("counts today as the first day of the window", () => {
		expect(since(1, TODAY)).toBe("2026-08-01");
		expect(since(7, TODAY)).toBe("2026-07-26");
	});
});

describeWithMongo("usageRepository", () => {
	async function use(overrides: Partial<Parameters<typeof recordCommandUse>[0]> = {}, at = TODAY): Promise<void> {
		await recordCommandUse({ command: "ban", guildId: GUILD, surface: "slash", failed: false, ...overrides }, at);
	}

	it("counts an invocation", async () => {
		await use();

		expect(await usageTotals(7, TODAY)).toMatchObject({ runs: 1, failures: 0, activeGuilds: 1, commandsUsed: 1 });
	});

	/** One row per command per server per day: a row per invocation would grow without bound. */
	it("increments the same row rather than adding another", async () => {
		await use();
		await use();
		await use();

		expect(await CommandUsages.countDocuments({})).toBe(1);
		expect((await usageTotals(7, TODAY)).runs).toBe(3);
	});

	it("counts failures separately from runs", async () => {
		await use();
		await use({ failed: true });

		expect(await usageTotals(7, TODAY)).toMatchObject({ runs: 2, failures: 1 });
	});

	it("keeps the two surfaces apart", async () => {
		await use({ surface: "slash" });
		await use({ surface: "prefix" });
		await use({ surface: "prefix" });

		expect(await surfaceTallies(7, TODAY)).toEqual({ slash: 1, prefix: 2 });
	});

	it("ranks commands by how often they ran", async () => {
		await use({ command: "ban" });
		await use({ command: "rank" });
		await use({ command: "rank" });

		expect(await commandTallies(7, 0, TODAY)).toEqual([
			{ command: "rank", count: 2, failures: 0 },
			{ command: "ban", count: 1, failures: 0 },
		]);
	});

	it("ranks servers by how much they use the bot", async () => {
		await use({ guildId: GUILD });
		await use({ guildId: OTHER });
		await use({ guildId: OTHER });

		expect(await guildTallies(7, 0, TODAY)).toEqual([
			{ guildId: OTHER, count: 2 },
			{ guildId: GUILD, count: 1 },
		]);
	});

	/** A direct message has no server, and counting it as one would inflate "servers using the bot". */
	it("does not count a direct message as an active server", async () => {
		await use({ guildId: null });

		expect((await usageTotals(7, TODAY)).activeGuilds).toBe(0);
		expect(await guildTallies(7, 0, TODAY)).toEqual([]);
		expect(await CommandUsages.countDocuments({ guildId: DIRECT_MESSAGE })).toBe(1);
	});

	it("groups by day, oldest first", async () => {
		await use({}, new Date("2026-07-30T09:00:00.000Z"));
		await use({}, TODAY);
		await use({}, TODAY);

		expect(await dailyTallies(7, TODAY)).toEqual([
			{ day: "2026-07-30", count: 1, failures: 0 },
			{ day: "2026-08-01", count: 2, failures: 0 },
		]);
	});

	it("leaves anything older than the window out", async () => {
		await use({}, new Date("2026-06-01T09:00:00.000Z"));
		await use({}, TODAY);

		expect((await usageTotals(7, TODAY)).runs).toBe(1);
		expect((await usageTotals(90, TODAY)).runs).toBe(2);
	});

	/** The expiry is set when the row is created, so a busy day is not held for ninety days past its last use. */
	it("stamps an expiry once rather than sliding it forward", async () => {
		await use({}, TODAY);
		const first = await CommandUsages.findOne({}).lean();

		await use({}, new Date(TODAY.getTime() + 60_000));
		const second = await CommandUsages.findOne({}).lean();

		expect(second?.expiresAt.getTime()).toBe(first?.expiresAt.getTime());
	});

	/** The owner's drill-down into one server reads the same rows, so another server's runs must never leak in. */
	it("narrows every tally to one server when asked", async () => {
		await use({ guildId: GUILD, command: "ban", surface: "prefix" });
		await use({ guildId: OTHER, command: "rank" });
		await use({ guildId: OTHER, command: "rank" });

		expect(await commandTallies(7, 0, TODAY, GUILD)).toEqual([{ command: "ban", count: 1, failures: 0 }]);
		expect(await dailyTallies(7, TODAY, GUILD)).toEqual([{ day: "2026-08-01", count: 1, failures: 0 }]);
		expect(await surfaceTallies(7, TODAY, GUILD)).toEqual({ slash: 0, prefix: 1 });
	});
});

describeWithMongo("dashboard use per server", () => {
	it("ranks servers by how many screens were opened there", async () => {
		await recordDashboardView(GUILD, TODAY);
		await recordDashboardView(OTHER, TODAY);
		await recordDashboardView(OTHER, new Date("2026-07-30T09:00:00.000Z"));

		expect(await dashboardTallies(7, 0, TODAY)).toEqual([
			{ guildId: OTHER, count: 2, lastDay: "2026-08-01" },
			{ guildId: GUILD, count: 1, lastDay: "2026-08-01" },
		]);
	});

	/** One row per server per day, holding a count and nothing else: no user, and not which screen. */
	it("keeps one row a day that names nobody", async () => {
		await recordDashboardView(GUILD, TODAY);
		await recordDashboardView(GUILD, TODAY);

		const rows = await DashboardViews.find({}).lean();
		expect(rows).toHaveLength(1);
		expect(Object.keys(rows[0] ?? {}).sort()).toEqual(["__v", "_id", "count", "day", "expiresAt", "guildId"]);
	});

	it("leaves out days past the window and other servers when narrowed", async () => {
		await recordDashboardView(GUILD, new Date("2026-06-01T09:00:00.000Z"));
		await recordDashboardView(GUILD, TODAY);
		await recordDashboardView(OTHER, TODAY);

		expect(await dashboardTallies(7, 0, TODAY, GUILD)).toEqual([{ guildId: GUILD, count: 1, lastDay: "2026-08-01" }]);
		expect(await dashboardTallies(90, 1, TODAY)).toEqual([{ guildId: GUILD, count: 2, lastDay: "2026-08-01" }]);
	});
});
