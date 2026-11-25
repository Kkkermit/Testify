import { BUSINESSES, findShopItem, HOUSES, JOBS, SHOP_ITEMS } from "@lib/economy/shop.util";

describe("the economy catalogues", () => {
	const catalogues = {
		SHOP_ITEMS,
		HOUSES,
		BUSINESSES,
		JOBS,
	} as const;

	it("gives every entry in every catalogue its own id, a name and an emoji", () => {
		const faulty = Object.entries(catalogues).filter(
			([, items]) =>
				new Set(items.map((item) => item.id)).size !== items.length ||
				items.some((item) => item.name === "" || item.emoji === ""),
		);

		expect(faulty.map(([name]) => name)).toEqual([]);
	});

	/** No job requires an item nobody can buy. */
	it("only requires items that are actually purchasable", () => {
		for (const job of JOBS) {
			for (const requirement of job.requirements) {
				expect(findShopItem(requirement)).toBeDefined();
			}
		}
	});
});
