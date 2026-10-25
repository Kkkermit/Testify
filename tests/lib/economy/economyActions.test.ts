import { describeWithMongo } from "../../helpers/mongo";
import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { addInventoryItem, findAccount, getOrCreateAccount } from "@database/repositories/economyRepository";
import { claimDaily, useItem } from "@lib/economy/economyActions.util";

const GUILD = "900000000000000001";
const ALICE = "100000000000000001";
const DAY = ECONOMY_COOLDOWNS.daily;
const START = Date.UTC(2026, 9, 1);

const wallet = async (): Promise<number> => (await findAccount(GUILD, ALICE))?.wallet ?? 0;
const reward = (streak: number): number => ECONOMY.dailyBase + streak * ECONOMY.dailyStreakBonus;

async function holding(itemId: string, quantity: number): Promise<void> {
	await getOrCreateAccount(GUILD, ALICE);
	await addInventoryItem(GUILD, ALICE, { itemId, name: itemId, emoji: "🎣", quantity });
}

describeWithMongo("claimDaily", () => {
	it("pays the first claim and starts a streak", async () => {
		const before = (await getOrCreateAccount(GUILD, ALICE)).wallet;

		const result = await claimDaily(GUILD, ALICE, START);

		expect(result).toMatchObject({ claimed: true, streak: 1, reward: reward(1) });
		expect(await wallet()).toBe(before + reward(1));
	});

	it("refuses a second claim the same day and pays nothing for it", async () => {
		await claimDaily(GUILD, ALICE, START);
		const after = await wallet();

		const again = await claimDaily(GUILD, ALICE, START + DAY - 1);

		expect(again.claimed).toBe(false);
		expect(again.message).toMatch(/already claimed/i);
		expect(await wallet()).toBe(after);
	});

	it("grows the streak a day later and starts again after a missed day", async () => {
		await claimDaily(GUILD, ALICE, START);

		expect(await claimDaily(GUILD, ALICE, START + DAY)).toMatchObject({ claimed: true, streak: 2 });
		expect(await claimDaily(GUILD, ALICE, START + DAY * 4)).toMatchObject({ claimed: true, streak: 1 });
	});

	it("stops the streak growing at its cap", async () => {
		let now = START;
		for (let day = 0; day < ECONOMY.dailyStreakCap + 2; day += 1) {
			await claimDaily(GUILD, ALICE, now);
			now += DAY;
		}

		expect(await claimDaily(GUILD, ALICE, now)).toMatchObject({ streak: ECONOMY.dailyStreakCap });
	});

	/** A double press on the balance panel's Daily button reads the same day twice; only one of them may be paid. */
	it("pays exactly one of several claims racing each other", async () => {
		const before = (await getOrCreateAccount(GUILD, ALICE)).wallet;

		const results = await Promise.all(Array.from({ length: 5 }, () => claimDaily(GUILD, ALICE, START)));

		expect(results.filter((result) => result.claimed)).toHaveLength(1);
		expect(await wallet()).toBe(before + reward(1));
	});
});

describeWithMongo("useItem", () => {
	const roll = (min: number): number => min + 1;

	it("consumes one of the item and pays its outcome", async () => {
		await holding("fishing_rod", 2);
		const before = await wallet();

		const result = await useItem(GUILD, ALICE, "fishing_rod", roll);

		expect(result).toMatchObject({ used: true, reward: 101 });
		expect(await wallet()).toBe(before + 101);
		expect((await findAccount(GUILD, ALICE))?.inventory).toEqual([
			expect.objectContaining({ itemId: "fishing_rod", quantity: 1 }),
		]);
	});

	it("refuses an item that does not exist, cannot be used or is not owned, and pays nothing", async () => {
		await holding("laptop", 1);
		const before = await wallet();

		expect((await useItem(GUILD, ALICE, "no_such_item", roll)).used).toBe(false);
		expect((await useItem(GUILD, ALICE, "laptop", roll)).used).toBe(false);
		expect((await useItem(GUILD, ALICE, "fishing_rod", roll)).used).toBe(false);
		expect(await wallet()).toBe(before);
	});

	it("takes the last one off the inventory rather than leaving a zero", async () => {
		await holding("fishing_rod", 1);

		await useItem(GUILD, ALICE, "fishing_rod", roll);

		expect((await findAccount(GUILD, ALICE))?.inventory).toEqual([]);
	});

	/** The item is taken before the money moves, so two presses on the last one cannot both be paid. */
	it("pays once when the last item is used twice at once", async () => {
		await holding("fishing_rod", 1);
		const before = await wallet();

		const results = await Promise.all([
			useItem(GUILD, ALICE, "fishing_rod", roll),
			useItem(GUILD, ALICE, "fishing_rod", roll),
		]);

		expect(results.filter((result) => result.used)).toHaveLength(1);
		expect(await wallet()).toBe(before + 101);
	});

	it("uses an item with nothing to pay out without paying", async () => {
		await holding("bank_upgrade", 1);
		const before = await wallet();

		expect(await useItem(GUILD, ALICE, "bank_upgrade", roll)).toMatchObject({ used: true, reward: 0 });
		expect(await wallet()).toBe(before);
	});
});
