import { LEVELLING } from "../../src/config/constants";
import {
	addXp,
	awardXp,
	getLevelLeaderboard,
	getRank,
	getUserLevel,
	levelFromXp,
	resetGuildLevels,
	xpForNextLevel,
} from "../../src/database/repositories/levelRepository";
import { describeWithMongo, mongoAvailable } from "../helpers/mongo";

describe("level maths", () => {
	it("derives a level from total XP", () => {
		expect(levelFromXp(0)).toBe(0);
		expect(levelFromXp(LEVELLING.xpForLevel(1))).toBe(1);
		expect(levelFromXp(LEVELLING.xpForLevel(5) - 1)).toBe(4);
	});

	it("reports the next threshold", () => {
		expect(xpForNextLevel(2)).toBe(LEVELLING.xpForLevel(3));
	});
});

describeWithMongo("levelRepository", () => {
	it("awards XP on the first message", async () => {
		if (!mongoAvailable()) return;

		const result = await awardXp("guild-1", "user-1", 10);
		expect(result?.record.xp).toBe(10);
	});

	// XP used to be farmable: there was no per-user cooldown at all.
	it("refuses a second award inside the cooldown window", async () => {
		if (!mongoAvailable()) return;

		await awardXp("guild-1", "user-1", 10);
		expect(await awardXp("guild-1", "user-1", 10)).toBeNull();
	});

	it("awards again once the cooldown has passed", async () => {
		if (!mongoAvailable()) return;

		await awardXp("guild-1", "user-1", 10);
		expect(await awardXp("guild-1", "user-1", 10, 0)).not.toBeNull();
	});

	// The old handler added the multiplied amount and then the base amount again.
	it("credits exactly the amount asked for", async () => {
		if (!mongoAvailable()) return;

		await awardXp("guild-1", "user-1", 25);
		expect((await getUserLevel("guild-1", "user-1"))?.xp).toBe(25);
	});

	it("reports a level-up when a threshold is crossed", async () => {
		if (!mongoAvailable()) return;

		const result = await awardXp("guild-1", "user-1", LEVELLING.xpForLevel(3));
		expect(result?.levelledUp).toBe(true);
		expect(result?.record.level).toBe(3);
	});

	it("ranks members by level then XP", async () => {
		if (!mongoAvailable()) return;

		await addXp("guild-1", "low", 50);
		await addXp("guild-1", "high", 5_000);

		expect((await getLevelLeaderboard("guild-1", 5))[0]?.userId).toBe("high");
		expect(await getRank("guild-1", "high")).toBe(1);
		expect(await getRank("guild-1", "low")).toBe(2);
	});

	it("returns no rank for a member with no XP", async () => {
		if (!mongoAvailable()) return;
		expect(await getRank("guild-1", "stranger")).toBeNull();
	});

	it("resets an entire guild", async () => {
		if (!mongoAvailable()) return;

		await addXp("guild-1", "a", 100);
		await addXp("guild-1", "b", 100);

		expect(await resetGuildLevels("guild-1")).toBe(2);
		expect(await getUserLevel("guild-1", "a")).toBeNull();
	});
});
