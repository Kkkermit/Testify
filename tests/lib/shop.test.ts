import { BUSINESSES, findBusiness, findHouse, findJob, findShopItem, HOUSES, JOBS, SHOP_ITEMS } from "@lib/shop.util";

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

	it("prices every shop item, house and business above zero", () => {
		for (const item of [...SHOP_ITEMS, ...HOUSES, ...BUSINESSES]) {
			expect(item.price).toBeGreaterThan(0);
		}
	});

	it("pays every job something", () => {
		for (const job of JOBS) expect(job.basePay).toBeGreaterThan(0);
	});

	/**
	 * A job gated behind an item nobody can buy is unreachable, which is exactly the kind of dead content the audit
	 * found in the JavaScript economy.
	 */
	it("only requires items that are actually purchasable", () => {
		for (const job of JOBS) {
			for (const requirement of job.requirements) {
				expect(findShopItem(requirement)).toBeDefined();
			}
		}
	});
});

describe("the finders", () => {
	it("find an entry that exists", () => {
		expect(findShopItem(SHOP_ITEMS[0]!.id)).toEqual(SHOP_ITEMS[0]);
		expect(findHouse(HOUSES[0]!.id)).toEqual(HOUSES[0]);
		expect(findBusiness(BUSINESSES[0]!.id)).toEqual(BUSINESSES[0]);
		expect(findJob(JOBS[0]!.id)).toEqual(JOBS[0]);
	});

	it("return undefined for an unknown id rather than throwing", () => {
		expect(findShopItem("nope")).toBeUndefined();
		expect(findHouse("nope")).toBeUndefined();
		expect(findBusiness("nope")).toBeUndefined();
		expect(findJob("nope")).toBeUndefined();
	});

	it("do not confuse one catalogue for another", () => {
		expect(findHouse(SHOP_ITEMS[0]!.id)).toBeUndefined();
		expect(findJob(HOUSES[0]!.id)).toBeUndefined();
	});
});
