import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { MONEY_PANEL_ID } from "@lib/economy/economy.constants";
import { amountPanel, parseMoneyAction } from "@lib/economy/moneyPanel.util";
import { idsOf } from "@tests/helpers/containers";

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

	it("remembers where it was opened in every button, with the owner last", () => {
		for (const id of idsOf(amountPanel("wit", BALANCES, OWNER, "balance"))) {
			const parsed = parseCustomId(id);
			expect(parsed.args.at(-1)).toBe(OWNER);
			if (parsed.id === MONEY_PANEL_ID) expect(parseMoneyAction(parsed.action)?.origin).toBe("balance");
		}
	});
});
