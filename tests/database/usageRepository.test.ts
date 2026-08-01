import { describeWithMongo, mongoAvailable } from "../helpers/mongo";
import { CommandUsages } from "@database/models/analytics.schema";
import {
	commandTallies,
	dailyTallies,
	dayKey,
	DIRECT_MESSAGE,
	guildTallies,
	recordCommandUse,
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
		if (!mongoAvailable()) return;
		await use();

		expect(await usageTotals(7, TODAY)).toMatchObject({ runs: 1, failures: 0, activeGuilds: 1, commandsUsed: 1 });
	});

	/** One row per command per server per day: a row per invocation would grow without bound. */
	it("increments the same row rather than adding another", async () => {
		if (!mongoAvailable()) return;
		await use();
		await use();
		await use();

		expect(await CommandUsages.countDocuments({})).toBe(1);
		expect((await usageTotals(7, TODAY)).runs).toBe(3);
	});

	it("counts failures separately from runs", async () => {
		if (!mongoAvailable()) return;
		await use();
		await use({ failed: true });

		expect(await usageTotals(7, TODAY)).toMatchObject({ runs: 2, failures: 1 });
	});

	it("keeps the two surfaces apart", async () => {
		if (!mongoAvailable()) return;
		await use({ surface: "slash" });
		await use({ surface: "prefix" });
		await use({ surface: "prefix" });

		expect(await surfaceTallies(7, TODAY)).toEqual({ slash: 1, prefix: 2 });
	});

	it("ranks commands by how often they ran", async () => {
		if (!mongoAvailable()) return;
		await use({ command: "ban" });
		await use({ command: "rank" });
		await use({ command: "rank" });

		expect(await commandTallies(7, 0, TODAY)).toEqual([
			{ command: "rank", count: 2, failures: 0 },
			{ command: "ban", count: 1, failures: 0 },
		]);
	});

	it("ranks servers by how much they use the bot", async () => {
		if (!mongoAvailable()) return;
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
		if (!mongoAvailable()) return;
		await use({ guildId: null });

		expect((await usageTotals(7, TODAY)).activeGuilds).toBe(0);
		expect(await guildTallies(7, 0, TODAY)).toEqual([]);
		expect(await CommandUsages.countDocuments({ guildId: DIRECT_MESSAGE })).toBe(1);
	});

	it("groups by day, oldest first", async () => {
		if (!mongoAvailable()) return;
		await use({}, new Date("2026-07-30T09:00:00.000Z"));
		await use({}, TODAY);
		await use({}, TODAY);

		expect(await dailyTallies(7, TODAY)).toEqual([
			{ day: "2026-07-30", count: 1, failures: 0 },
			{ day: "2026-08-01", count: 2, failures: 0 },
		]);
	});

	it("leaves anything older than the window out", async () => {
		if (!mongoAvailable()) return;
		await use({}, new Date("2026-06-01T09:00:00.000Z"));
		await use({}, TODAY);

		expect((await usageTotals(7, TODAY)).runs).toBe(1);
		expect((await usageTotals(90, TODAY)).runs).toBe(2);
	});

	/** The expiry is set when the row is created, so a busy day is not held for ninety days past its last use. */
	it("stamps an expiry once rather than sliding it forward", async () => {
		if (!mongoAvailable()) return;
		await use({}, TODAY);
		const first = await CommandUsages.findOne({}).lean();

		await use({}, new Date(TODAY.getTime() + 60_000));
		const second = await CommandUsages.findOne({}).lean();

		expect(second?.expiresAt.getTime()).toBe(first?.expiresAt.getTime());
	});
});
