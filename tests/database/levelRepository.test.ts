import { describeWithMongo, mongoAvailable } from "../helpers/mongo";
import {
	addXp,
	awardXp,
	getLevelLeaderboard,
	getRank,
	getUserLevel,
	levelFromXp,
	resetGuildLevels,
	setLevel,
	xpForNextLevel,
} from "@database/repositories/levelRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";
const BOB = "333333333333333333";

describe("the levelling curve", () => {
	it("starts everyone at level zero", () => {
		expect(levelFromXp(0)).toBe(0);
	});

	it("gets harder as the level goes up", () => {
		expect(xpForNextLevel(2) - xpForNextLevel(1)).toBeLessThan(xpForNextLevel(10) - xpForNextLevel(9));
	});

	it("agrees with itself in both directions", () => {
		for (const level of [1, 5, 12, 30]) expect(levelFromXp(xpForNextLevel(level))).toBeGreaterThanOrEqual(level);
	});
});

describeWithMongo("levelRepository", () => {
	it("awards XP and reports when someone levels up", async () => {
		if (!mongoAvailable()) return;

		const first = await awardXp(GUILD, ALICE, 10);
		expect(first?.levelledUp).toBe(false);

		const jump = await addXp(GUILD, ALICE, 5_000);
		expect(jump.level).toBeGreaterThan(0);
	});

	it("holds XP back until the cooldown has passed", async () => {
		if (!mongoAvailable()) return;

		await awardXp(GUILD, BOB, 10);
		expect(await awardXp(GUILD, BOB, 10)).toBeNull();
	});

	it("ranks members by XP", async () => {
		if (!mongoAvailable()) return;

		await setLevel(GUILD, ALICE, 1);
		await setLevel(GUILD, BOB, 10);

		const [top] = await getLevelLeaderboard(GUILD, 10);
		expect(top?.userId).toBe(BOB);
		expect(await getRank(GUILD, BOB)).toBe(1);
	});

	it("resets a server's levels", async () => {
		if (!mongoAvailable()) return;

		await setLevel(GUILD, ALICE, 5);
		expect(await resetGuildLevels(GUILD)).toBeGreaterThan(0);
		expect(await getUserLevel(GUILD, ALICE)).toBeNull();
	});
});
