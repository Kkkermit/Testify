import { Types } from "mongoose";
import { parseCustomId } from "@core/button";
import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { BOARD_HEIGHT, BOARD_WIDTH, chipLabel, chipSpot, chipStacks, spotRect } from "@lib/canvas/rouletteTable.util";
import { ROULETTE_ID, ROULETTE_ROUND, SEAT_COLOURS } from "@lib/casino/casino.constants";
import { type RouletteBet } from "@lib/casino/casino.types";
import { ROULETTE_SPOTS } from "@lib/casino/roulette.util";
import {
	chipSteps,
	parseNumbers,
	roundBettingMessage,
	roundChips,
	roundResults,
	roundSettledMessage,
	roundSpinningMessage,
	roundView,
} from "@lib/casino/rouletteRound.util";
import { buttonsOf, customIdsOf, duplicateIds, textOf } from "@tests/helpers/containers";

const ALICE = "222222222222222222";
const BOB = "333333333333333333";
const n = (number: number): RouletteBet => ({ kind: "number", number });

function record(overrides: Partial<RoundRecord> = {}): RoundRecord {
	return {
		_id: new Types.ObjectId("65f000000000000000000001"),
		guildId: "111111111111111111",
		channelId: "444444444444444444",
		messageId: "555555555555555555",
		hostId: ALICE,
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

	it("has no countdown until the first bet", () => {
		expect(roundView(record()).closesAt).toBeNull();
	});

	it("puts every player's chips on the table in their own seat", () => {
		expect(roundChips(roundView(busy))).toEqual([
			{ bet: { kind: "red" }, amount: 200, seat: 0 },
			{ bet: n(17), amount: 200, seat: 0 },
			{ bet: n(17), amount: 50, seat: 1 },
		]);
	});

	it("skips a stored spot it does not recognise rather than failing the round", () => {
		const odd = record({ players: { [ALICE]: { name: "alice", joinedAt: 1, bets: [{ spot: "n99", amount: 5 }] } } });
		expect(roundView(odd).players[0]?.bets).toEqual([]);
	});

	it("pays each player from their own bets on one pocket", () => {
		// 17 is black and odd: alice's red loses, both chips on 17 win 36 times their amount.
		const results = roundResults(roundView(busy), 17);

		expect(results.map((result) => [result.player.name, result.staked, result.returned])).toEqual([
			["alice", 400, 200 * 36],
			["bob", 50, 50 * 36],
		]);
	});

	it("leaves out anybody who only changed their chip", () => {
		const watcher = record({ players: { [ALICE]: { name: "alice", joinedAt: 1, chip: 500, bets: [] } } });
		expect(roundResults(roundView(watcher), 0)).toEqual([]);
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
	it("waits for the first bet before counting down", () => {
		expect(textOf(roundBettingMessage(roundView(record())))).toContain("Waiting for the first bet");
		expect(textOf(roundBettingMessage(roundView(record())))).toContain(
			`${String(ROULETTE_ROUND.bettingMs / 1_000)} seconds`,
		);
	});

	it("counts down in the reader's own client once the first bet is down", () => {
		const text = textOf(roundBettingMessage(roundView(busy)));

		expect(text).toContain("The wheel spins <t:1700000030:R>");
		expect(text).toContain("**450** on the table");
	});

	it("names each player by their chip colour, with their bets and what they have staked", () => {
		const text = textOf(roundBettingMessage(roundView(busy)));

		expect(text).toContain(
			`${SEAT_COLOURS[0].emoji} **alice** · 2/${String(ROULETTE_ROUND.maxBets)} bets · **400** — Red, 17`,
		);
		expect(text).toContain(`${SEAT_COLOURS[1].emoji} **bob** · 1/${String(ROULETTE_ROUND.maxBets)} bets · **50** — 17`);
	});

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

	it("offers chip sizes scaled from the table's own chip", () => {
		expect(chipSteps(100)).toEqual([100, 500, 1_000, 2_500]);
		const labels = buttonsOf(roundBettingMessage(roundView(busy))).map((found) => found.label);
		expect(labels).toEqual(expect.arrayContaining(["100", "500", "1,000", "2,500", "Other…"]));
	});

	it("stays within Discord's 40-component limit", () => {
		let count = 0;
		const walk = (node: unknown): void => {
			if (node === null || typeof node !== "object") return;
			const found = node as Record<string, unknown>;
			if (typeof found.type === "number") count += 1;
			for (const value of Object.values(found)) if (Array.isArray(value)) value.forEach(walk);
		};
		walk(roundBettingMessage(roundView(busy)).components[0]!.toJSON());

		expect(count).toBeLessThanOrEqual(40);
	});
});

describe("the spin and the result", () => {
	it("shows the wheel over the table as betting closed, with no buttons", () => {
		const message = roundSpinningMessage(roundView(busy), Buffer.from("GIF"));

		expect(message.files?.map((file) => file.name)).toEqual(["roulette.gif", "roulette-table.png"]);
		expect(buttonsOf(message)).toEqual([]);
	});

	it("says where the ball landed and what each player got, then offers a new round", () => {
		const view = { ...roundView(busy), pocket: 17 };
		const message = roundSettledMessage(view, Buffer.from("PNG"));
		const text = textOf(message);

		expect(text).toContain("# 🎯 17 black");
		expect(text).toContain("**alice** won **7,200** (+6,800)");
		expect(text).toContain("**bob** won **1,800** (+1,750)");
		const again = buttonsOf(message).find((found) => parseCustomId(String(found.custom_id)).action === "again");
		expect(parseCustomId(String(again?.custom_id)).args).toEqual(["100"]);
		expect(message.files?.map((file) => file.name)).toEqual(["roulette.png", "roulette-table.png"]);
	});

	it("says so, and offers a new round, when nobody bet", () => {
		const text = textOf(roundSettledMessage(roundView(record()), null));
		expect(text).toContain("Nobody placed a bet");
	});
});

describe("the board", () => {
	it("keeps every spot on the picture, and no two spots on top of each other", () => {
		const rects = ROULETTE_SPOTS.map(spotRect);
		for (const rect of rects) {
			expect(rect.x + rect.width).toBeLessThanOrEqual(BOARD_WIDTH);
			expect(rect.y + rect.height).toBeLessThanOrEqual(BOARD_HEIGHT);
		}
		for (const [index, a] of rects.entries()) {
			for (const b of rects.slice(index + 1)) {
				const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
				expect(overlaps).toBe(false);
			}
		}
	});

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

	it("stacks everybody's chips on a spot and shows the spot's total", () => {
		expect(chipStacks(roundChips(roundView(busy)))).toEqual([
			{ bet: { kind: "red" }, total: 200, seats: [0] },
			{ bet: n(17), total: 250, seats: [0, 1] },
		]);
	});

	it("writes a chip's figure in four characters or fewer", () => {
		expect(chipLabel(1_500)).toBe("1.5K");
		for (const amount of [1, 999, 9_999, 99_999, 1e10, 9.99e12])
			expect(chipLabel(amount).length).toBeLessThanOrEqual(4);
	});
});
