import mongoose from "mongoose";
import { describeWithMongo } from "../helpers/mongo";
import {
	DIRECT_MESSAGE,
	earlierDashboardViews,
	earlierScreenViews,
	earlierUses,
} from "@database/repositories/earlierUsageRepository";

const HERE = "900000000000000001";
const THERE = "900000000000000002";
const EXPIRES = new Date("2027-01-01T00:00:00.000Z");

const raw = (name: string) => {
	const db = mongoose.connection.db;
	if (db === undefined) throw new Error("not connected");
	return db.collection(name);
};

describeWithMongo("earlierUsageRepository", () => {
	// No model owns these any more, so the harness empties nothing here and each test starts them afresh.
	beforeEach(async () => {
		await Promise.all(["commandusages", "screenviews", "dashboardviews"].map((name) => raw(name).deleteMany({})));
	});

	/** These are the rows the bot wrote before Shardlens, shaped as its old schema wrote them. */
	it("sums the old command counts by day, command, server and surface, from the first day of the window", async () => {
		await raw("commandusages").insertMany([
			{ day: "2026-11-01", guildId: HERE, command: "ban", surface: "slash", count: 4, failures: 1, expiresAt: EXPIRES },
			{
				day: "2026-11-01",
				guildId: HERE,
				command: "ban",
				surface: "prefix",
				count: 2,
				failures: 0,
				expiresAt: EXPIRES,
			},
			{
				day: "2026-11-02",
				guildId: THERE,
				command: "beg",
				surface: "slash",
				count: 3,
				failures: 0,
				expiresAt: EXPIRES,
			},
			{
				day: "2026-11-02",
				guildId: DIRECT_MESSAGE,
				command: "help",
				surface: "slash",
				count: 1,
				failures: 0,
				expiresAt: EXPIRES,
			},
			// Before the window, so it is left out.
			{
				day: "2026-10-31",
				guildId: HERE,
				command: "ban",
				surface: "slash",
				count: 50,
				failures: 5,
				expiresAt: EXPIRES,
			},
		]);

		const uses = await earlierUses("2026-11-01");
		const sorted = (rows: { key: string }[]) => [...rows].sort((a, b) => a.key.localeCompare(b.key));

		expect(sorted(uses.byDay)).toEqual([
			{ key: "2026-11-01", count: 6, failures: 1 },
			{ key: "2026-11-02", count: 4, failures: 0 },
		]);
		expect(sorted(uses.byCommand)).toEqual([
			{ key: "ban", count: 6, failures: 1 },
			{ key: "beg", count: 3, failures: 0 },
			{ key: "help", count: 1, failures: 0 },
		]);
		expect(sorted(uses.byGuild)).toEqual([
			{ key: HERE, count: 6, failures: 1 },
			{ key: THERE, count: 3, failures: 0 },
			{ key: DIRECT_MESSAGE, count: 1, failures: 0 },
		]);
		expect(sorted(uses.bySurface)).toEqual([
			{ key: "prefix", count: 2, failures: 0 },
			{ key: "slash", count: 8, failures: 1 },
		]);

		const here = await earlierUses("2026-11-01", HERE);
		expect(here.byCommand).toEqual([{ key: "ban", count: 6, failures: 1 }]);
	});

	/** A row nobody wrote through the old schema must not throw a figure off. */
	it("leaves out a row whose key or count is not what the bot wrote", async () => {
		await raw("commandusages").insertMany([
			{ day: "2026-11-01", guildId: HERE, command: 7, surface: "slash", count: 2, failures: 0 },
			{ day: "2026-11-01", guildId: HERE, command: "ban", surface: "slash", count: "lots", failures: 0 },
		]);

		const uses = await earlierUses("2026-11-01");
		expect(uses.byCommand).toEqual([{ key: "ban", count: 0, failures: 0 }]);
	});

	it("sums the old screen and server views from the first day of the window", async () => {
		await raw("screenviews").insertMany([
			{ day: "2026-11-01", route: "/guilds/:guildId/levelling", count: 5, expiresAt: EXPIRES },
			{ day: "2026-11-02", route: "/guilds/:guildId/levelling", count: 2, expiresAt: EXPIRES },
			{ day: "2026-10-01", route: "/guilds/:guildId/settings", count: 9, expiresAt: EXPIRES },
		]);
		await raw("dashboardviews").insertMany([
			{ day: "2026-11-01", guildId: HERE, count: 3, expiresAt: EXPIRES },
			{ day: "2026-11-02", guildId: THERE, count: 1, expiresAt: EXPIRES },
		]);

		expect(await earlierScreenViews("2026-11-01")).toEqual([
			{ key: "/guilds/:guildId/levelling", count: 7, failures: 0 },
		]);
		expect(await earlierDashboardViews("2026-11-01", HERE)).toEqual([{ key: HERE, count: 3, failures: 0 }]);
		expect((await earlierDashboardViews("2026-11-01")).length).toBe(2);
	});

	/** Once the TTL index has emptied them, the collections may not exist at all, and that is an empty answer. */
	it("answers nothing for collections that are gone", async () => {
		await Promise.all(
			["commandusages", "screenviews", "dashboardviews"].map((name) =>
				raw(name)
					.drop()
					.catch(() => false),
			),
		);

		expect(await earlierUses("2026-11-01")).toEqual({ byDay: [], byCommand: [], byGuild: [], bySurface: [] });
		expect(await earlierScreenViews("2026-11-01")).toEqual([]);
		expect(await earlierDashboardViews("2026-11-01")).toEqual([]);
	});
});
