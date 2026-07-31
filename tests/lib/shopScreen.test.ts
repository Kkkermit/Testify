import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { ALL_PETS } from "@lib/pets.util";
import { HOUSES, JOBS, SHOP_ITEMS } from "@lib/shop.util";
import {
	type Balances,
	decodeShopState,
	encodeShopState,
	entriesFor,
	isPetRarity,
	isShopSection,
	SHOP_ID,
	SHOP_PAGE_SIZE,
	SHOP_SECTIONS,
	shopScreen,
	type ShopState,
} from "@lib/shopScreen.util";
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

	it("round-trips a state with no optional parts", () => {
		const state: ShopState = { section: "items" };
		expect(decodeShopState(parseCustomId(encodeShopState("nav", state, OWNER)).args)).toEqual(state);
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

	it("ignores a rarity that is not one", () => {
		expect(decodeShopState(["pets", "shiny", "-"]).rarity).toBeUndefined();
	});

	it("copes with no arguments at all", () => {
		expect(decodeShopState([])).toEqual({ section: "items" });
	});
});

describe("the section guards", () => {
	it("accepts the real sections and rarities", () => {
		expect(isShopSection("pets")).toBe(true);
		expect(isPetRarity("legendary")).toBe(true);
	});

	it("rejects anything else", () => {
		expect(isShopSection("weapons")).toBe(false);
		expect(isPetRarity("mythic")).toBe(false);
	});
});

describe("entriesFor", () => {
	it("lists every item, house and job", () => {
		expect(entriesFor({ section: "items" }, RICH)).toHaveLength(SHOP_ITEMS.length);
		expect(entriesFor({ section: "houses" }, RICH)).toHaveLength(HOUSES.length);
		expect(entriesFor({ section: "jobs" }, RICH)).toHaveLength(JOBS.length);
	});

	it("lists every pet when no rarity is chosen, and just that tier when one is", () => {
		expect(entriesFor({ section: "pets" }, RICH)).toHaveLength(ALL_PETS.length);

		const legendary = entriesFor({ section: "pets", rarity: "legendary" }, RICH);
		expect(legendary.length).toBeGreaterThan(0);
		expect(legendary.length).toBeLessThan(ALL_PETS.length);
	});

	/** The reason has to be on the entry, so the list can say why before you click. */
	it("blocks a house when one is already owned", () => {
		const owned = entriesFor({ section: "houses" }, { ...RICH, ownsHouse: true });
		expect(owned.every((entry) => entry.blocked !== undefined)).toBe(true);
	});

	it("blocks a business that is already owned, and only that one", () => {
		const [first] = entriesFor({ section: "businesses" }, RICH);
		const after = entriesFor({ section: "businesses" }, { ...RICH, ownedBusinessIds: [first!.id] });

		expect(after.find((entry) => entry.id === first!.id)?.blocked).toBeDefined();
		expect(after.filter((entry) => entry.blocked !== undefined)).toHaveLength(1);
	});

	it("blocks a pet when one is already owned", () => {
		expect(entriesFor({ section: "pets" }, { ...RICH, hasPet: true }).every((e) => e.blocked !== undefined)).toBe(true);
	});

	it("blocks a job whose required items are missing, and names them", () => {
		const gated = JOBS.find((job) => job.requirements.length > 0);
		const entry = entriesFor({ section: "jobs" }, BROKE).find((candidate) => candidate.id === gated?.id);

		expect(entry?.blocked).toContain(gated!.requirements[0]!);
	});

	it("does not block a job once its requirements are owned", () => {
		const gated = JOBS.find((job) => job.requirements.length > 0);
		const entry = entriesFor({ section: "jobs" }, RICH).find((candidate) => candidate.id === gated?.id);

		expect(entry?.blocked).toBeUndefined();
	});

	it("blocks the job you already have", () => {
		const [first] = JOBS;
		const entry = entriesFor({ section: "jobs" }, { ...RICH, job: first!.name }).find((e) => e.id === first!.id);

		expect(entry?.blocked).toBe("This is already your job.");
	});
});

describe("the catalogue screen", () => {
	const screen = shopScreen({ section: "items" }, RICH, OWNER);

	it("is a Components V2 message, so text and buttons can interleave", () => {
		expect(screen.flags).toBe(MessageFlags.IsComponentsV2);
	});

	it("shows the wallet, so the price means something", () => {
		expect(textOf(screen)).toContain("Wallet");
	});

	/** The ask: the catalogue is readable in the message, not hidden in a dropdown. */
	it("lists each item by name and price in the body", () => {
		const rendered = textOf(screen);

		for (const item of SHOP_ITEMS.slice(0, SHOP_PAGE_SIZE)) {
			expect(rendered).toContain(item.name);
			expect(rendered).toContain(item.description);
		}
	});

	it("puts a buy button beside every item shown", () => {
		const buys = idsOf(screen).filter((id) => parseCustomId(id).action === "buy");
		expect(buys).toHaveLength(Math.min(SHOP_ITEMS.length, SHOP_PAGE_SIZE));
	});

	it("offers a tab for every section, with the current one disabled", () => {
		const tabs = idsOf(screen).filter((id) => parseCustomId(id).action === "nav");
		expect(tabs.length).toBeGreaterThanOrEqual(SHOP_SECTIONS.length);
	});

	it("namespaces every control to the shop handler", () => {
		for (const id of idsOf(screen)) expect(parseCustomId(id).id).toBe(SHOP_ID);
	});

	it("adds a rarity strip only on the pets section", () => {
		const petTabs = idsOf(shopScreen({ section: "pets" }, RICH, OWNER))
			.map((id) => decodeShopState(parseCustomId(id).args).rarity)
			.filter((rarity) => rarity !== undefined);

		expect(petTabs.length).toBeGreaterThan(0);
		expect(
			idsOf(screen)
				.map((id) => decodeShopState(parseCustomId(id).args).rarity)
				.filter((rarity) => rarity !== undefined),
		).toHaveLength(0);
	});

	/** Discord caps a Components V2 message at 40 components. */
	it("stays well inside the component budget on every section", () => {
		for (const section of SHOP_SECTIONS) {
			const built = shopScreen({ section }, RICH, OWNER).components[0]!.toJSON();
			expect(JSON.stringify(built).length).toBeLessThan(30_000);
			expect(buttonsOf(shopScreen({ section }, RICH, OWNER)).length).toBeLessThanOrEqual(20);
		}
	});

	it("pages long sections rather than listing everything at once", () => {
		const pets = shopScreen({ section: "pets" }, RICH, OWNER);
		const buys = idsOf(pets).filter((id) => parseCustomId(id).action === "buy");

		expect(buys).toHaveLength(SHOP_PAGE_SIZE);
		expect(textOf(pets)).toContain("Page 1 of");
	});

	it("carries the page through the custom ID", () => {
		const second = shopScreen({ section: "pets", page: 1 }, RICH, OWNER);
		expect(textOf(second)).toContain("Page 2 of");
	});

	it("shows a confirmation banner after a purchase", () => {
		const after = shopScreen({ section: "items" }, RICH, OWNER, "Bought a Laptop.");
		expect(textOf(after)).toContain("Bought a Laptop.");
	});
});

describe("the detail screen", () => {
	const item = SHOP_ITEMS[0]!;
	const detail = shopScreen({ section: "items", selectedId: item.id }, RICH, OWNER);

	it("shows the price and the wallet together", () => {
		expect(textOf(detail)).toContain("Price");
		expect(textOf(detail)).toContain("Wallet");
	});

	it("offers a buy button and a way back", () => {
		const actions = idsOf(detail).map((id) => parseCustomId(id).action);
		expect(actions).toEqual(["buy", "nav"]);
	});

	it("disables buying when the item cannot be afforded, and says why", () => {
		const poor = shopScreen({ section: "items", selectedId: item.id }, BROKE, OWNER);

		expect(buttonsOf(poor)[0]?.disabled).toBe(true);
		expect(textOf(poor)).toContain("cannot afford");
	});

	it("disables buying a second house and says why", () => {
		const owned = shopScreen({ section: "houses", selectedId: HOUSES[0]!.id }, { ...RICH, ownsHouse: true }, OWNER);

		expect(buttonsOf(owned)[0]?.disabled).toBe(true);
		expect(textOf(owned)).toContain("already own a house");
	});

	it("labels a free job differently from a purchase", () => {
		const job = shopScreen({ section: "jobs", selectedId: JOBS[0]!.id }, RICH, OWNER);
		expect(buttonsOf(job)[0]?.label).toBe("Take this job");
	});

	it("keeps the rarity when going back from a pet, so you return to the right tier", () => {
		const pet = shopScreen({ section: "pets", rarity: "legendary", selectedId: "lion" }, RICH, OWNER);
		const back = idsOf(pet)[1]!;

		expect(decodeShopState(parseCustomId(back).args).rarity).toBe("legendary");
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
