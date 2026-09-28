import { resolveColor } from "discord.js";
import { theme } from "@config/theme";
import { parseCustomId } from "@core/button";
import { type BlackjackState, type Card, type Rank } from "@lib/casino/casino.types";
import {
	blackjackMessage,
	hiloMessage,
	instantSettledMessage,
	instantSpinningMessage,
	payoutLine,
	resultHeadline,
	resultTone,
} from "@lib/casino/casinoPanel.util";
import {
	betLimitRefusal,
	CASINO_GAMES,
	casinoRefusal,
	limitsLine,
	normaliseCasinoSettings,
} from "@lib/casino/casinoSettings.util";
import { casinoLobby, casinoSettingsPanel, parseLimits } from "@lib/casino/casinoSettingsPanel.util";
import { coinflipOutcome, outcomeFor } from "@lib/casino/instantGames.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const GREEN = resolveColor(theme.colours.success);
const RED = resolveColor(theme.colours.error);

function accentOf(message: { components?: unknown[] }): unknown {
	const [box] = message.components ?? [];
	return (box as { toJSON(): { accent_color?: number } }).toJSON().accent_color;
}
const card = (rank: Rank, suit: Card["suit"] = "spades"): Card => ({ rank, suit });

function blackjack(player: Rank[], dealer: Rank[]): BlackjackState {
	return {
		player: player.map((rank) => card(rank)),
		dealer: dealer.map((rank) => card(rank)),
		deck: [],
		doubled: false,
	};
}

function button(message: Parameters<typeof buttonsOf>[0], action: string): Record<string, unknown> | undefined {
	return buttonsOf(message).find((found) => parseCustomId(String(found.custom_id)).action === action);
}

describe("the casino's settings", () => {
	it("opens everything to a server that has never set it", () => {
		const settings = normaliseCasinoSettings(null);

		expect(settings).toMatchObject({ enabled: true, minBet: 1, maxBet: null, configured: false });
		expect(CASINO_GAMES.every((game) => settings.games[game])).toBe(true);
	});

	it("reads the stored switches, limits and games switched off", () => {
		const settings = normaliseCasinoSettings({ enabled: false, disabledGames: ["slots"], minBet: 50, maxBet: 900 });

		expect(settings).toMatchObject({ enabled: false, minBet: 50, maxBet: 900, configured: true });
		expect(settings.games.slots).toBe(false);
		expect(settings.games.roulette).toBe(true);
	});

	it("refuses every game while closed, and one game while it alone is off", () => {
		const closed = normaliseCasinoSettings({ enabled: false, disabledGames: [], minBet: 1, maxBet: null });
		const noSlots = normaliseCasinoSettings({ enabled: true, disabledGames: ["slots"], minBet: 1, maxBet: null });

		expect(casinoRefusal(closed, "roulette")).toMatch(/closed/);
		expect(casinoRefusal(closed, null)).toMatch(/closed/);
		expect(casinoRefusal(noSlots, "slots")).toMatch(/Slots is switched off/);
		expect(casinoRefusal(noSlots, "roulette")).toBeNull();
	});

	it("holds a bet to the limits", () => {
		expect(betLimitRefusal({ minBet: 10, maxBet: 100 }, 9)).toMatch(/smallest/);
		expect(betLimitRefusal({ minBet: 10, maxBet: 100 }, 101)).toMatch(/largest/);
		expect(betLimitRefusal({ minBet: 10, maxBet: null }, 1_000_000)).toBeNull();
		expect(limitsLine({ minBet: 10, maxBet: null })).toMatch(/no upper limit/);
	});

	it("reads the limits form, a blank ceiling meaning none", () => {
		expect(parseLimits("10", "")).toEqual({ ok: true, minBet: 10, maxBet: null });
		expect(parseLimits("1,000", "5000")).toEqual({ ok: true, minBet: 1_000, maxBet: 5_000 });
		expect(parseLimits("0", "")).toMatchObject({ ok: false });
		expect(parseLimits("10", "lots")).toMatchObject({ ok: false });
	});
});

describe("the settings panel", () => {
	const open = normaliseCasinoSettings(null);

	/** The router refuses anybody but the last argument, so the manager who opened it is the only one it answers. */
	it("puts the manager's id last on every control", () => {
		const panel = casinoSettingsPanel(open, OWNER);

		for (const id of idsOf(panel)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		expect(duplicateIds(panel)).toEqual([]);
	});

	it("offers a button for every game, and greys them out while the casino is closed", () => {
		const closed = casinoSettingsPanel({ ...open, enabled: false }, OWNER);

		expect(buttonsOf(closed).filter((found) => parseCustomId(String(found.custom_id)).action === "game")).toHaveLength(
			CASINO_GAMES.length,
		);
		expect(button(closed, "open")).toBeDefined();
		expect(button(closed, "game")?.disabled).toBe(true);
	});

	it("lists every game and what it pays in the lobby", () => {
		const lobby = textOf(casinoLobby({ ...open, games: { ...open.games, dice: false } }));

		expect(lobby).toContain("Roulette");
		expect(lobby).toContain("3 to 2");
		expect(lobby).toMatch(/Dice\*\* · switched off here/);
	});
});

describe("an instant game's messages", () => {
	it("congratulates a win by what it made, and names a loss by what it cost", () => {
		expect(resultHeadline(100, 350)).toBe("# 🎉 Congratulations, you won 250!");
		expect(resultHeadline(100, 0)).toBe("# 💸 You lost 100");
		expect(resultHeadline(100, 40)).toBe("# 💸 You lost 60");
		expect(resultHeadline(100, 100)).toBe("# 🤝 Your 100 came back");
	});

	it("shows the arithmetic only when there is some", () => {
		expect(payoutLine(100, 350)).toBe("**350** paid on a **100** bet.");
		expect(payoutLine(100, 40)).toBe("**40** of your **100** came back.");
		expect(payoutLine(100, 0)).toBeNull();
		expect(payoutLine(100, 100)).toBeNull();
	});

	it("reads a partial return as a loss and an exact one as neither", () => {
		expect(resultTone(100, 101)).toBe("win");
		expect(resultTone(100, 100)).toBe("even");
		expect(resultTone(100, 99)).toBe("lose");
	});

	/** The stripe down the message is the first thing anybody sees, before a word of it is read. */
	it("colours a settled message green for a win and red for a loss, and leaves the spin alone", () => {
		const win = coinflipOutcome("heads", 100, () => 0);
		const loss = coinflipOutcome("tails", 100, () => 0);

		expect(accentOf(instantSettledMessage(win, 100, null, OWNER, Buffer.from("PNG")))).toBe(GREEN);
		expect(accentOf(instantSettledMessage(loss, 100, null, OWNER, Buffer.from("PNG")))).toBe(RED);
		expect(accentOf(instantSpinningMessage(win, 100, Buffer.from("GIF")))).not.toBe(GREEN);
		expect(textOf(instantSettledMessage(win, 100, null, OWNER, Buffer.from("PNG")))).toContain("Congratulations");
	});

	it("attaches the animation, and swaps it for the picture once settled", () => {
		const outcome = coinflipOutcome("heads", 100, () => 0);
		const spinning = instantSpinningMessage(outcome, 100, Buffer.from("GIF"));
		const settled = instantSettledMessage(outcome, 100, 1_095, OWNER, Buffer.from("PNG"));

		expect(spinning.files?.[0]?.name).toBe("coinflip.gif");
		expect(settled.files?.[0]?.name).toBe("coinflip.png");
		// Without the empty list the edit would keep the GIF and add the picture beside it.
		expect(settled.attachments).toEqual([]);
		expect(textOf(settled)).toContain("Wallet: 1,095");
	});

	/** Play again has to replay the same call for the same stake, or a button could change a bet nobody chose. */
	it("carries the same call and stake in Play again", () => {
		const outcome = coinflipOutcome("tails", 100, () => 0);
		const again = button(instantSettledMessage(outcome, 100, null, OWNER, Buffer.from("PNG")), "again");

		expect(parseCustomId(String(again?.custom_id)).args).toEqual(["coinflip", "tails", "100", OWNER]);
		expect(outcomeFor("coinflip", "tails", 100, () => 0)?.betLine).toBe("Tails");
	});

	it("reads back only calls a button could have carried", () => {
		expect(outcomeFor("coinflip", "edge", 100)).toBeNull();
		expect(outcomeFor("dice", "over", 100)?.betLine).toBe("Over 7");
		expect(outcomeFor("slots", "line", 100)?.game).toBe("slots");
	});
});

describe("the blackjack table", () => {
	const deciding = { bet: 100, staked: 100, verdict: null, returned: 0, wallet: null };

	it("offers hit, stand and double while the hand is live, each only to its player", () => {
		const message = blackjackMessage({ ...deciding, state: blackjack(["5", "6"], ["10", "7"]) }, OWNER);

		expect(accentOf(message)).not.toBe(GREEN);
		expect(accentOf(message)).not.toBe(RED);
		expect(idsOf(message).map((id) => parseCustomId(id).action)).toEqual(["bj-hit", "bj-stand", "bj-double"]);
		for (const id of idsOf(message)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	it("stops offering a double once a third card is drawn", () => {
		const message = blackjackMessage({ ...deciding, state: blackjack(["5", "6", "2"], ["10", "7"]) }, OWNER);

		expect(button(message, "bj-double")?.disabled).toBe(true);
	});

	it("settles with the verdict, the money and a new deal", () => {
		const message = blackjackMessage(
			{
				state: blackjack(["10", "9"], ["10", "7"]),
				bet: 100,
				staked: 100,
				verdict: "win",
				returned: 200,
				wallet: 1_200,
			},
			OWNER,
		);

		expect(textOf(message)).toContain("You win");
		expect(textOf(message)).toContain("Congratulations, you won 100!");
		expect(accentOf(message)).toBe(GREEN);
		expect(idsOf(message).map((id) => parseCustomId(id).action)).toEqual(["again"]);
	});

	it("says when a hand was stood for its player", () => {
		const message = blackjackMessage(
			{
				state: blackjack(["10", "9"], ["10", "7"]),
				bet: 100,
				staked: 100,
				verdict: "win",
				returned: 200,
				wallet: null,
				auto: true,
			},
			OWNER,
		);

		expect(textOf(message)).toContain("stood for you");
	});
});

describe("the hi-lo table", () => {
	it("prices each call on its button and disables the one that cannot win", () => {
		const message = hiloMessage(
			{
				state: { current: card("A"), history: [], multiplier: 1, rounds: 0 },
				staked: 100,
				phase: "open",
				returned: 0,
				wallet: null,
				lastCall: null,
			},
			OWNER,
		);

		expect(button(message, "hl-higher")?.disabled).toBe(true);
		expect(button(message, "hl-lower")?.label).toBe("Lower ×1.05");
		expect(button(message, "hl-cash")?.label).toBe("Cash out · 100");
	});

	it("tells a lost hand what the card was", () => {
		const message = hiloMessage(
			{
				state: { current: card("3"), history: [card("7")], multiplier: 0, rounds: 1 },
				staked: 100,
				phase: "lost",
				returned: 0,
				wallet: null,
				lastCall: false,
			},
			OWNER,
		);

		expect(textOf(message)).toContain("3♠");
		expect(textOf(message)).toContain("You lost 100");
		expect(accentOf(message)).toBe(RED);
	});
});
