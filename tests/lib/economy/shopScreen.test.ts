import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { SHOP_ID, SHOP_SECTIONS } from "@lib/economy/economy.constants";
import { type Balances, type ShopState } from "@lib/economy/economy.types";
import { HOUSES, SHOP_ITEMS } from "@lib/economy/shop.util";
import {
	decodeShopState,
	encodeShopState,
	entriesFor,
	isPetRarity,
	isShopSection,
	SHOP_PAGE_SIZE,
	shopScreen,
} from "@lib/economy/shopScreen.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

const RICH: Balances = {
	wallet: 10_000_000,
	ownsHouse: false,
	ownedBusinessIds: [],
	ownedItemIds: SHOP_ITEMS.map((item) => item.id),
	job: "Unemployed",
	hasPet: false,
};

const BROKE: Balances = { ...RICH, wallet: 0, ownedItemIds: [] };

describe("shop state", () => {
	it("round-trips through the custom ID", () => {
		const state: ShopState = { section: "pets", rarity: "legendary", selectedId: "lion" };
		const encoded = encodeShopState("nav", state, OWNER);

		expect(decodeShopState(parseCustomId(encoded).args)).toEqual(state);
	});

	it.each(SHOP_SECTIONS)("round-trips the %s section", (section) => {
		expect(decodeShopState(parseCustomId(encodeShopState("nav", { section }, OWNER)).args).section).toBe(section);
	});

	it("puts the owner last, so ownerOnly can read it", () => {
		const args = parseCustomId(encodeShopState("nav", { section: "items" }, OWNER)).args;
		expect(args.at(-1)).toBe(OWNER);
	});

	it("stays inside Discord's 100-character custom ID limit", () => {
		const longest = encodeShopState(
			"nav",
			{ section: "businesses", rarity: "legendary", selectedId: "a".repeat(30) },
			OWNER,
		);
		expect(longest.length).toBeLessThanOrEqual(100);
	});

	/** A tampered or stale ID should land on the catalogue, not crash. */
	it("falls back to items for a section it does not recognise", () => {
		expect(decodeShopState(["nonsense", "-", "-"]).section).toBe("items");
	});
});

describe("the section guards", () => {
	it("rejects anything else", () => {
		expect(isShopSection("weapons")).toBe(false);
		expect(isPetRarity("mythic")).toBe(false);
	});
});

describe("entriesFor", () => {
	/** The reason has to be on the entry, so the list can say why before you click. */
	it("blocks a house when one is already owned", () => {
		const owned = entriesFor({ section: "houses" }, { ...RICH, ownsHouse: true });
		expect(owned.every((entry) => entry.blocked !== undefined)).toBe(true);
	});
});

describe("the catalogue screen", () => {
	const screen = shopScreen({ section: "items" }, RICH, OWNER);

	it("is a Components V2 message, so text and buttons can interleave", () => {
		expect(screen.flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** The ask: the catalogue is readable in the message, not hidden in a dropdown. */
	it("lists each item by name and price in the body", () => {
		const rendered = textOf(screen);

		for (const item of SHOP_ITEMS.slice(0, SHOP_PAGE_SIZE)) {
			expect(rendered).toContain(item.name);
			expect(rendered).toContain(item.description);
		}
	});

	/** Discord caps a Components V2 message at 40 components. */
	it("stays well inside the component budget on every section", () => {
		for (const section of SHOP_SECTIONS) {
			const built = shopScreen({ section }, RICH, OWNER).components[0]!.toJSON();
			expect(JSON.stringify(built).length).toBeLessThan(30_000);
			expect(buttonsOf(shopScreen({ section }, RICH, OWNER)).length).toBeLessThanOrEqual(20);
		}
	});

	it("carries the page through the custom ID", () => {
		const second = shopScreen({ section: "pets", page: 1 }, RICH, OWNER);
		expect(textOf(second)).toContain("Page 2 of");
	});
});

describe("the detail screen", () => {
	const item = SHOP_ITEMS[0]!;

	it("disables buying when the item cannot be afforded, and says why", () => {
		const poor = shopScreen({ section: "items", selectedId: item.id }, BROKE, OWNER);

		expect(buttonsOf(poor)[0]?.disabled).toBe(true);
		expect(textOf(poor)).toContain("cannot afford");
	});

	/** A stale ID should show the catalogue rather than an empty detail view. */
	it("falls back to the catalogue when the selection no longer exists", () => {
		const stale = shopScreen({ section: "items", selectedId: "no_such_item" }, RICH, OWNER);
		expect(idsOf(stale).filter((id) => parseCustomId(id).action === "nav").length).toBeGreaterThan(0);
	});
});

describe("custom ID uniqueness", () => {
	/** Discord rejects the entire message when two components share a custom ID, disabled ones included. */
	it.each(SHOP_SECTIONS)("has no duplicate IDs anywhere in the %s section", (section) => {
		for (const page of [0, 1, 2, 20]) {
			expect(duplicateIds(shopScreen({ section, page }, RICH, OWNER))).toEqual([]);
		}
	});

	it("has no duplicate IDs on the pet rarity tabs", () => {
		for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"] as const) {
			expect(duplicateIds(shopScreen({ section: "pets", rarity, page: 1 }, RICH, OWNER))).toEqual([]);
		}
	});

	it("has no duplicate IDs when a house is owned", () => {
		const owner: Balances = { ...RICH, ownsHouse: true, houseId: HOUSES[0]!.id };
		expect(duplicateIds(shopScreen({ section: "houses" }, owner, OWNER))).toEqual([]);
	});
});

describe("a shop opened from the balance panel", () => {
	const fromBalance: ShopState = { section: "items", from: "balance" };

	/** Every tab, page, rarity and Back press re-renders the shop, so each has to carry the way back with it. */
	it("keeps the way back through every button the shop draws", () => {
		for (const section of SHOP_SECTIONS) {
			const screen = shopScreen({ section, from: "balance" }, RICH, OWNER);
			const shopIds = idsOf(screen).filter((id) => parseCustomId(id).id === SHOP_ID);

			expect(shopIds.length).toBeGreaterThan(0);
			for (const id of shopIds) expect(decodeShopState(parseCustomId(id).args).from).toBe("balance");
		}

		const detail = shopScreen({ ...fromBalance, selectedId: SHOP_ITEMS[0]!.id }, BROKE, OWNER);
		for (const id of idsOf(detail)) expect(decodeShopState(parseCustomId(id).args).from).toBe("balance");
	});

	/** Discord caps a Components V2 message at 40 components, and the pets tab is the fullest screen. */
	it("still fits Discord's component limit with the extra button", () => {
		const pets = shopScreen({ section: "pets", from: "balance" }, RICH, OWNER);
		let count = 0;
		const walk = (node: unknown): void => {
			if (node === null || typeof node !== "object") return;
			const record = node as Record<string, unknown>;
			if (typeof record.type === "number") count += 1;
			for (const value of Object.values(record)) {
				if (Array.isArray(value)) value.forEach(walk);
				else if (value !== null && typeof value === "object") walk(value);
			}
		};
		pets.components.forEach((component) => walk(component.toJSON()));

		expect(count).toBeLessThanOrEqual(40);
	});
});
