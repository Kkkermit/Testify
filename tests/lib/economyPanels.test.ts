import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { type EconomyAccount } from "@database/models/economy.schema";
import { BALANCE_PANEL_ID, balancePanel } from "@lib/balancePanel.util";
import { dailyReady, USE_OUTCOMES } from "@lib/economyActions.util";
import { heldItems, INVENTORY_PANEL_ID, inventoryScreen } from "@lib/inventoryScreen.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

const VIEW = {
	wallet: 1_500,
	bank: 8_500,
	username: "alice",
	avatarUrl: "https://cdn.test/avatar.png",
	own: true,
};

function account(overrides: Partial<EconomyAccount> = {}): EconomyAccount {
	return {
		wallet: 1_500,
		bank: 8_500,
		inventory: [],
		lastDaily: null,
		...overrides,
	} as unknown as EconomyAccount;
}

describe("dailyReady", () => {
	it("is ready when it has never been claimed", () => {
		expect(dailyReady(null)).toBe(true);
	});

	it("is not ready immediately after claiming", () => {
		expect(dailyReady(new Date(), Date.now())).toBe(false);
	});

	it("is ready again a day later", () => {
		expect(dailyReady(new Date(0), 25 * 60 * 60 * 1_000)).toBe(true);
	});
});

describe("the balance panel", () => {
	const own = balancePanel(VIEW, OWNER);

	it("is a Components V2 message", () => {
		expect(own.flags).toBe(MessageFlags.IsComponentsV2);
	});

	it("shows the wallet, bank and total", () => {
		const rendered = textOf(own);

		expect(rendered).toContain("1,500");
		expect(rendered).toContain("8,500");
		expect(rendered).toContain("10,000");
	});

	it("offers the actions you would take next", () => {
		const actions = idsOf(own).map((id) => parseCustomId(id).action);
		expect(actions).toEqual(expect.arrayContaining(["dep", "wit", "daily", "shop", "inv", "refresh"]));
	});

	/** You cannot spend someone else's money, so their card carries no controls. */
	it("drops every control when looking at someone else", () => {
		expect(buttonsOf(balancePanel({ ...VIEW, own: false }, OWNER))).toHaveLength(0);
	});

	it("still shows their figures", () => {
		expect(textOf(balancePanel({ ...VIEW, own: false }, OWNER))).toContain("1,500");
	});

	it("disables Deposit with an empty wallet and Withdraw with an empty bank", () => {
		const broke = buttonsOf(balancePanel({ ...VIEW, wallet: 0 }, OWNER));
		const unbanked = buttonsOf(balancePanel({ ...VIEW, bank: 0 }, OWNER));

		expect(broke.find((b) => b.label === "Deposit")?.disabled).toBe(true);
		expect(unbanked.find((b) => b.label === "Withdraw")?.disabled).toBe(true);
	});

	it("greys out Daily once it has been claimed", () => {
		const claimed = buttonsOf(balancePanel({ ...VIEW, dailyReady: false }, OWNER));
		expect(claimed.find((b) => b.label === "Daily")?.disabled).toBe(true);
	});

	it("shows a banner after an action rather than a second message", () => {
		expect(textOf(balancePanel({ ...VIEW, note: "You collected 500." }, OWNER))).toContain("You collected 500.");
	});

	it("namespaces every control to the balance handler", () => {
		for (const id of idsOf(own)) expect(parseCustomId(id).id).toBe(BALANCE_PANEL_ID);
	});
});

describe("heldItems", () => {
	/** A zero quantity is a leftover row, not something you own. */
	it("ignores items whose quantity has dropped to zero", () => {
		const items = heldItems(
			account({
				inventory: [
					{ itemId: "fishing_rod", name: "Fishing Rod", emoji: "🎣", quantity: 0 },
					{ itemId: "laptop", name: "Laptop", emoji: "💻", quantity: 2 },
				],
			} as Partial<EconomyAccount>),
		);

		expect(items.map((item) => item.itemId)).toEqual(["laptop"]);
	});
});

describe("the inventory screen", () => {
	const stocked = account({
		inventory: [
			{ itemId: "fishing_rod", name: "Fishing Rod", emoji: "🎣", quantity: 1 },
			{ itemId: "laptop", name: "Laptop", emoji: "💻", quantity: 3 },
		],
	} as Partial<EconomyAccount>);

	it("lists each item with its quantity", () => {
		const rendered = textOf(inventoryScreen(stocked, "alice", OWNER));

		expect(rendered).toContain("Fishing Rod");
		expect(rendered).toContain("×3");
	});

	it("puts a Use button beside every item", () => {
		const uses = idsOf(inventoryScreen(stocked, "alice", OWNER)).filter((id) => parseCustomId(id).action === "use");
		expect(uses).toHaveLength(2);
	});

	/** A laptop is not usable, so its button is there but dead. */
	it("disables Use on an item that cannot be used", () => {
		const controls = buttonsOf(inventoryScreen(stocked, "alice", OWNER));
		const laptop = controls.find((control) => String(control.custom_id).includes("laptop"));

		expect(laptop?.disabled).toBe(true);
	});

	it("says so plainly when there is nothing to show", () => {
		expect(textOf(inventoryScreen(account(), "alice", OWNER))).toMatch(/nothing here yet/i);
	});

	/** Viewing someone else must never offer to spend their items. */
	it("disables every Use button when it is not yours", () => {
		const other = inventoryScreen(stocked, "bob", OWNER, 0, undefined, false);
		const uses = buttonsOf(other).filter((control) => String(control.custom_id).includes(":use:"));

		expect(uses.length).toBeGreaterThan(0);
		for (const control of uses) expect(control.disabled).toBe(true);
	});

	it("drops the navigation buttons when it is not yours", () => {
		const other = inventoryScreen(stocked, "bob", OWNER, 0, undefined, false);
		const actions = idsOf(other).map((id) => parseCustomId(id).action);

		expect(actions).not.toContain("shop");
		expect(actions).not.toContain("bal");
	});

	it("carries the page through the custom ID so paging survives a restart", () => {
		const many = account({
			inventory: Array.from({ length: 12 }, (_unused, index) => ({
				itemId: `item_${index}`,
				name: `Item ${index}`,
				emoji: "📦",
				quantity: 1,
			})),
		} as Partial<EconomyAccount>);

		expect(textOf(inventoryScreen(many, "alice", OWNER, 1))).toContain("Page 2 of");
	});

	it("namespaces every control to the inventory handler", () => {
		for (const id of idsOf(inventoryScreen(stocked, "alice", OWNER))) {
			expect(parseCustomId(id).id).toBe(INVENTORY_PANEL_ID);
		}
	});
});

describe("USE_OUTCOMES", () => {
	/** A payout range that is backwards would make randomInt throw at runtime. */
	it("never has a minimum above its maximum", () => {
		for (const outcome of Object.values(USE_OUTCOMES)) expect(outcome.min).toBeLessThanOrEqual(outcome.max);
	});
});
