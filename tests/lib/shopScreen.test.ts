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
	SHOP_SECTIONS,
	shopScreen,
	type ShopState,
} from "@lib/shopScreen.util";

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

function idsOf(rendered: ReturnType<typeof shopScreen>): string[] {
	return rendered.components.flatMap((row) =>
		row.components.map((component) => (component.toJSON() as { custom_id?: string }).custom_id ?? ""),
	);
}

function selectOptions(rendered: ReturnType<typeof shopScreen>): { label: string; value: string }[] {
	for (const row of rendered.components) {
		const json = row.components[0]?.toJSON() as { options?: { label: string; value: string }[] };
		if (json.options) return json.options;
	}
	return [];
}

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

	it("shows the wallet, so the price means something", () => {
		expect(JSON.stringify(screen.embeds[0]?.toJSON())).toContain("Your wallet");
	});

	/** The whole point — nothing to copy, everything to pick. */
	it("offers a menu of what is for sale instead of printing IDs", () => {
		const options = selectOptions(screen);

		expect(options).toHaveLength(SHOP_ITEMS.length);
		expect(JSON.stringify(screen.embeds[0]?.toJSON())).not.toContain("`");
	});

	it("puts the price in every option label", () => {
		for (const option of selectOptions(screen)) expect(option.label).toContain("—");
	});

	it("offers a tab for every section, with the current one disabled", () => {
		const tabs = screen.components[0]?.components.map((component) => component.toJSON());

		expect(tabs).toHaveLength(SHOP_SECTIONS.length);
		expect(tabs?.filter((tab) => tab.disabled === true)).toHaveLength(1);
	});

	it("namespaces every control to the shop handler", () => {
		for (const id of idsOf(screen)) expect(parseCustomId(id).id).toBe(SHOP_ID);
	});

	it("adds a rarity strip only on the pets section", () => {
		expect(shopScreen({ section: "pets" }, RICH, OWNER).components).toHaveLength(3);
		expect(screen.components).toHaveLength(2);
	});

	/** Discord rejects a select menu of more than 25 options. */
	it("never offers more than 25 options", () => {
		for (const section of SHOP_SECTIONS) {
			expect(selectOptions(shopScreen({ section }, RICH, OWNER)).length).toBeLessThanOrEqual(25);
		}
	});
});

describe("the detail screen", () => {
	const item = SHOP_ITEMS[0]!;
	const detail = shopScreen({ section: "items", selectedId: item.id }, RICH, OWNER);

	it("shows the price and the wallet together", () => {
		const fields = detail.embeds[0]?.toJSON().fields?.map((field) => field.name);
		expect(fields).toEqual(expect.arrayContaining(["Price", "Your wallet"]));
	});

	it("offers a buy button and a way back", () => {
		const actions = idsOf(detail).map((id) => parseCustomId(id).action);
		expect(actions).toEqual(["buy", "nav"]);
	});

	it("disables buying when the item cannot be afforded, and says why", () => {
		const poor = shopScreen({ section: "items", selectedId: item.id }, BROKE, OWNER);
		const buy = poor.components[0]?.components[0]?.toJSON() as { disabled?: boolean };

		expect(buy.disabled).toBe(true);
		expect(JSON.stringify(poor.embeds[0]?.toJSON())).toContain("cannot afford");
	});

	it("disables buying a second house and says why", () => {
		const owned = shopScreen({ section: "houses", selectedId: HOUSES[0]!.id }, { ...RICH, ownsHouse: true }, OWNER);
		const buy = owned.components[0]?.components[0]?.toJSON() as { disabled?: boolean };

		expect(buy.disabled).toBe(true);
		expect(JSON.stringify(owned.embeds[0]?.toJSON())).toContain("already own a house");
	});

	it("labels a free job differently from a purchase", () => {
		const job = shopScreen({ section: "jobs", selectedId: JOBS[0]!.id }, RICH, OWNER);
		const buy = job.components[0]?.components[0]?.toJSON() as { label?: string };

		expect(buy.label).toBe("Take this job");
	});

	it("keeps the rarity when going back from a pet, so you return to the right tier", () => {
		const pet = shopScreen({ section: "pets", rarity: "legendary", selectedId: "lion" }, RICH, OWNER);
		const back = idsOf(pet)[1]!;

		expect(decodeShopState(parseCustomId(back).args).rarity).toBe("legendary");
	});

	/** A stale ID should show the catalogue rather than an empty detail view. */
	it("falls back to the catalogue when the selection no longer exists", () => {
		const stale = shopScreen({ section: "items", selectedId: "no_such_item" }, RICH, OWNER);
		expect(selectOptions(stale).length).toBeGreaterThan(0);
	});
});
