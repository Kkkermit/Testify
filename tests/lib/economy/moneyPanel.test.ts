import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { BALANCE_PANEL_ID, MONEY_PANEL_ID } from "@lib/economy/economy.constants";
import { amountPanel, moneyAction, movedPanel, parseMoneyAction } from "@lib/economy/moneyPanel.util";
import { idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const BALANCES = { wallet: 1_000, bank: 400 };

describe("the deposit and withdraw chooser", () => {
	/** It replaces the balance panel in place, and a V2 message cannot be edited back into embeds. */
	it("is a V2 message with no embeds, wherever it is opened", () => {
		for (const origin of ["command", "balance"] as const) {
			const panel = amountPanel("dep", BALANCES, OWNER, origin) as { flags: number; embeds?: unknown };

			expect(panel.flags & MessageFlags.IsComponentsV2).toBeTruthy();
			expect(panel.embeds).toBeUndefined();
		}
	});

	it("offers amounts from the side the money leaves", () => {
		expect(textOf(amountPanel("dep", BALANCES, OWNER))).toContain("from your wallet");
		expect(idsOf(amountPanel("wit", BALANCES, OWNER))).toContain(`${MONEY_PANEL_ID}:wit:400:all:${OWNER}`);
	});

	it("goes back to the balance panel only when it was opened from there", () => {
		const back = `${BALANCE_PANEL_ID}:refresh:${OWNER}`;

		expect(idsOf(amountPanel("dep", BALANCES, OWNER, "balance"))).toContain(back);
		expect(idsOf(amountPanel("dep", BALANCES, OWNER, "command"))).not.toContain(back);
	});

	it("remembers where it was opened in every button, with the owner last", () => {
		for (const id of idsOf(amountPanel("wit", BALANCES, OWNER, "balance"))) {
			const parsed = parseCustomId(id);
			expect(parsed.args.at(-1)).toBe(OWNER);
			if (parsed.id === MONEY_PANEL_ID) expect(parseMoneyAction(parsed.action)?.origin).toBe("balance");
		}
	});

	it("reads every action it writes", () => {
		expect(parseMoneyAction(moneyAction("dep", "command"))).toEqual({
			action: "dep",
			origin: "command",
			step: "amount",
		});
		expect(parseMoneyAction(`${moneyAction("wit", "balance")}-custom`)).toEqual({
			action: "wit",
			origin: "balance",
			step: "custom",
		});
		expect(parseMoneyAction(`${moneyAction("dep", "balance")}-save`)?.step).toBe("save");
		expect(parseMoneyAction("steal")).toBeNull();
	});

	it("says what moved and what is left", () => {
		const text = textOf(movedPanel("dep", 250, { wallet: 750, bank: 650 }));
		expect(text).toContain("Deposited 250");
		expect(text).toContain("650");
	});
});
