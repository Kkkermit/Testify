import { describeWithMongo } from "../helpers/mongo";
import {
	addInventoryItem,
	findAccount,
	getOrCreateAccount,
	removeInventoryItem,
} from "@database/repositories/economyRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";
const ROD = { itemId: "fishing-rod", name: "Fishing Rod", emoji: "🎣", quantity: 1 };

async function rows(): Promise<[string, number][]> {
	const inventory = (await findAccount(GUILD, ALICE))?.inventory ?? [];
	return inventory.map((item) => [item.itemId, item.quantity]);
}

describeWithMongo("economyRepository's inventory", () => {
	/** Both purchases missed the stack and both pushed, so the inventory listed one item on two rows. */
	it("stacks one item bought twice at once into one row", async () => {
		await getOrCreateAccount(GUILD, ALICE);

		await Promise.all([addInventoryItem(GUILD, ALICE, ROD), addInventoryItem(GUILD, ALICE, ROD)]);

		expect(await rows()).toEqual([["fishing-rod", 2]]);
	});

	it("adds to a stack it already has, and uses one up without going below none", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await addInventoryItem(GUILD, ALICE, ROD);
		await addInventoryItem(GUILD, ALICE, { ...ROD, quantity: 2 });

		const used = await Promise.all([1, 2, 3, 4].map(() => removeInventoryItem(GUILD, ALICE, "fishing-rod")));

		expect(used.filter((account) => account !== null)).toHaveLength(3);
		expect(await rows()).toEqual([]);
	});
});
