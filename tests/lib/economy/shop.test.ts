import { BUSINESSES, findShopItem, HOUSES, JOBS, SHOP_ITEMS } from "@lib/economy/shop.util";

describe("the economy catalogues", () => {
	const catalogues = {
		SHOP_ITEMS,
		HOUSES,
		BUSINESSES,
		JOBS,
	} as const;

	it.each(Object.entries(catalogues))("%s has unique ids", (_name, items) => {
		expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
	});

	it.each(Object.entries(catalogues))("%s gives every entry a name and an emoji", (_name, items) => {
		for (const item of items) {
			expect(item.name.length).toBeGreaterThan(0);
			expect(item.emoji.length).toBeGreaterThan(0);
		}
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
