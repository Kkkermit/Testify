import { MessageFlags } from "discord.js";
import { type EconomyAccount } from "@database/models/economy.schema";
import { balancePanel } from "@lib/economy/balancePanel.util";
import { dailyReady, USE_OUTCOMES } from "@lib/economy/economyActions.util";
import { heldItems, inventoryScreen } from "@lib/economy/inventoryScreen.util";
import { buttonsOf, textOf } from "@tests/helpers/containers";

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
});

describe("the balance panel", () => {
	const own = balancePanel(VIEW, OWNER);

	it("is a Components V2 message", () => {
		expect(own.flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** You cannot spend someone else's money, so their card carries no controls. */
	it("drops every control when looking at someone else", () => {
		expect(buttonsOf(balancePanel({ ...VIEW, own: false }, OWNER))).toHaveLength(0);
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

	/** A laptop is not usable, so its button is there but dead. */
	it("disables Use on an item that cannot be used", () => {
		const controls = buttonsOf(inventoryScreen(stocked, "alice", OWNER));
		const laptop = controls.find((control) => String(control.custom_id).includes("laptop"));

		expect(laptop?.disabled).toBe(true);
	});

	/** Viewing someone else must never offer to spend their items. */
	it("disables every Use button when it is not yours", () => {
		const other = inventoryScreen(stocked, "bob", OWNER, 0, undefined, false);
		const uses = buttonsOf(other).filter((control) => String(control.custom_id).includes(":use:"));

		expect(uses.length).toBeGreaterThan(0);
		for (const control of uses) expect(control.disabled).toBe(true);
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
});

describe("USE_OUTCOMES", () => {
	/** A payout range that is backwards would make randomInt throw at runtime. */
	it("never has a minimum above its maximum", () => {
		for (const outcome of Object.values(USE_OUTCOMES)) expect(outcome.min).toBeLessThanOrEqual(outcome.max);
	});
});
