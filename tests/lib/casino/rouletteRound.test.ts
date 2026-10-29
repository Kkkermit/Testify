import { Types } from "mongoose";
import { parseCustomId } from "@core/button";
import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { BOARD_WIDTH, chipSpot, HISTORY_BAND, historySpots, LAYOUT, spotRect } from "@lib/canvas/rouletteTable.util";
import { ROULETTE_ID, ROULETTE_ROUND } from "@lib/casino/casino.constants";
import { ROULETTE_SPOTS } from "@lib/casino/roulette.util";
import { parseNumbers, roundBettingMessage, roundSettledMessage, roundView } from "@lib/casino/rouletteRound.util";
import { customIdsOf, duplicateIds, textOf } from "@tests/helpers/containers";

const ALICE = "222222222222222222";
const BOB = "333333333333333333";

function record(overrides: Partial<RoundRecord> = {}): RoundRecord {
	return {
		_id: new Types.ObjectId("65f000000000000000000001"),
		guildId: "111111111111111111",
		channelId: "444444444444444444",
		messageId: "555555555555555555",
		hostId: ALICE,
		hostName: "alice",
		chip: 100,
		status: "betting",
		closesAt: null,
		pocket: null,
		players: {},
		expiresAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

const busy = record({
	closesAt: new Date(1_700_000_030_000),
	players: {
		[BOB]: { name: "bob", joinedAt: 20, bets: [{ spot: "n17", amount: 50 }] },
		[ALICE]: {
			name: "alice",
			joinedAt: 10,
			chip: 200,
			bets: [
				{ spot: "red", amount: 200 },
				{ spot: "n17", amount: 200 },
			],
		},
	},
});

describe("a round's state", () => {
	/** Colours follow the order people sat down, so a player keeps their colour for the whole round. */
	it("seats players in the order they joined, each with their own chip", () => {
		const view = roundView(busy);

		expect(view.players.map((player) => [player.name, player.seat, player.chip])).toEqual([
			["alice", 0, 200],
			["bob", 1, 100],
		]);
		expect(view.closesAt).toBe(1_700_000_030_000);
	});
});

describe("reading numbers from the form", () => {
	it("reads one number or several, however they are separated, without repeats", () => {
		expect(parseNumbers("17")).toEqual([17]);
		expect(parseNumbers("7, 17 32")).toEqual([7, 17, 32]);
		expect(parseNumbers("0 and 36")).toEqual([0, 36]);
		expect(parseNumbers("5, 5")).toEqual([5]);
	});

	it("refuses anything that is not a number on the wheel", () => {
		expect(parseNumbers("")).toBeNull();
		expect(parseNumbers("37")).toBeNull();
		expect(parseNumbers("red")).toBeNull();
		expect(parseNumbers("-1")).toBeNull();
	});
});

describe("the open table", () => {
	/** Anybody in the channel may bet, so no control may carry one person's id as its owner. */
	it("offers a button for every outside bet, a number, the chip sizes and clearing, open to everybody", () => {
		const message = roundBettingMessage(roundView(busy));
		const actions = customIdsOf(message).map((id) => parseCustomId(id));

		expect(actions.every((parsed) => parsed.id === ROULETTE_ID)).toBe(true);
		expect(
			actions
				.filter((parsed) => parsed.action === "bet")
				.map((parsed) => parsed.args[1])
				.sort(),
		).toEqual(
			ROULETTE_SPOTS.filter((spot) => spot.kind !== "number")
				.map((spot) => spot.kind)
				.sort(),
		);
		expect(actions.map((parsed) => parsed.action)).toEqual(expect.arrayContaining(["num", "clear", "chip", "chipto"]));
		expect(duplicateIds(message)).toEqual([]);
		for (const id of customIdsOf(message)) expect(id.length).toBeLessThanOrEqual(100);
	});

	it("stays within Discord's 40-component limit", () => {
		let count = 0;
		const walk = (node: unknown): void => {
			if (node === null || typeof node !== "object") return;
			const found = node as Record<string, unknown>;
			if (typeof found.type === "number") count += 1;
			for (const value of Object.values(found)) if (Array.isArray(value)) value.forEach(walk);
		};
		walk(roundBettingMessage(roundView({ ...busy, private: true })).components[0]!.toJSON());

		expect(count).toBeLessThanOrEqual(40);
	});
});

describe("the spin and the result", () => {
	/** A winner's entry has to say who, how much they came out ahead, what they bet and on which spots. */
	it("names every winner by their profit, with their stake, what came back and each bet", () => {
		const text = textOf(roundSettledMessage({ ...roundView(busy), pocket: 17 }, null));

		expect(text).toContain("### 🏆 Winners");
		expect(text).toContain("**alice** won **6,800** 🎉\n-# Bet 400 on 2 spots · **7,200** came back");
		expect(text).toContain("> ❌ **Red** (1 to 1) · 200 lost\n> ✅ **17** (35 to 1) · 200 → **7,200**");
		expect(text).toContain("**bob** won **1,750** 🎉");
		expect(text).toContain("2 players · 450 on the table · 9,000 paid out");
		expect(text.indexOf("**alice**")).toBeLessThan(text.indexOf("**bob**"));
		expect(text).not.toContain("### 💸 Losers");
	});

	/** A player whose one winning bet was outweighed by the rest lost money, so they belong with the losers. */
	it("puts a player who won a bet but lost overall under Losers, showing what came back", () => {
		const mixed = record({
			players: {
				[ALICE]: {
					name: "alice",
					joinedAt: 1,
					bets: [
						{ spot: "red", amount: 100 },
						{ spot: "odd", amount: 100 },
						{ spot: "n22", amount: 5_000 },
					],
				},
			},
		});
		const text = textOf(roundSettledMessage({ ...roundView(mixed), pocket: 17 }, null));

		expect(text).toContain("Nobody came out ahead");
		expect(text.indexOf("### 💸 Losers")).toBeLessThan(text.indexOf("**alice**"));
		expect(text).toContain("**alice** lost **5,000**\n-# Bet 5,200 on 3 spots · **200** came back");
		expect(text).toContain("> ✅ **Odd** (1 to 1) · 100 → **200**");
	});

	it("keeps a crowded result inside Discord's limit for one text block", () => {
		const crowd = record({
			players: Object.fromEntries(
				Array.from({ length: 60 }, (_, index) => [
					`1000000000000000${String(index).padStart(2, "0")}`,
					{
						name: `player-with-a-long-name-${String(index)}`,
						joinedAt: index,
						bets: Array.from({ length: 10 }, (_unused, spot) => ({ spot: `n${String(spot)}`, amount: 1_000 })),
					},
				]),
			),
		});
		const message = roundSettledMessage({ ...roundView(crowd), pocket: 3 }, null);
		const texts = (message.components[0]!.toJSON() as { components: { type: number; content?: string }[] }).components
			.map((part) => part.content ?? "")
			.filter((content) => content !== "");

		for (const content of texts) expect(content.length).toBeLessThanOrEqual(4_000);
		expect(texts.join("\n")).toMatch(/…and \d+ more/);
	});
});

describe("the last spins", () => {
	/** The newest spin is drawn larger, and all five have to fit the strip without touching. */
	it("fits every spin in the strip, the newest larger than the rest", () => {
		const spots = historySpots(ROULETTE_ROUND.history);
		expect(spots[0]!.radius).toBeGreaterThan(spots[1]!.radius);
		for (const [index, spot] of spots.entries()) {
			expect(spot.x + spot.radius).toBeLessThanOrEqual(BOARD_WIDTH);
			// Clear of the picture's top edge, and of the first row of numbers below the strip.
			expect(spot.y - spot.radius).toBeGreaterThan(0);
			expect(spot.y + spot.radius).toBeLessThan(HISTORY_BAND + LAYOUT.margin);
			const next = spots[index + 1];
			if (next !== undefined) expect(next.x - next.radius).toBeGreaterThan(spot.x + spot.radius);
		}
	});
});

describe("the board", () => {
	/** A chip that spilled into the next spot would show a bet somewhere it is not. */
	it("keeps each chip inside its own spot", () => {
		for (const spot of ROULETTE_SPOTS) {
			const rect = spotRect(spot);
			const chip = chipSpot(spot);
			expect(chip.x - chip.radius).toBeGreaterThanOrEqual(rect.x);
			expect(chip.x + chip.radius).toBeLessThanOrEqual(rect.x + rect.width);
			expect(chip.y - chip.radius).toBeGreaterThanOrEqual(rect.y);
			expect(chip.y + chip.radius).toBeLessThanOrEqual(rect.y + rect.height);
		}
	});
});
