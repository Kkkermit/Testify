import { parseCustomId } from "@core/button";
import { BOARD_HEIGHT, BOARD_WIDTH, chipLabel, chipSpot, spotRect } from "@lib/canvas/rouletteTable.util";
import { type RouletteBet } from "@lib/casino/casino.types";
import { rouletteTableMessage, spotGroup } from "@lib/casino/casinoPanel.util";
import { rouletteOutcome } from "@lib/casino/instantGames.util";
import {
	decodeSpots,
	encodeSpots,
	ROULETTE_SPOTS,
	settleSpots,
	spotFromKey,
	spotKey,
	spotsLine,
} from "@lib/casino/roulette.util";
import { buttonsOf, customIdsOf, duplicateIds, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const n = (number: number): RouletteBet => ({ kind: "number", number });

describe("the spots on the table", () => {
	it("has one spot for each number and each outside bet, each with its own key", () => {
		expect(ROULETTE_SPOTS).toHaveLength(49);
		expect(new Set(ROULETTE_SPOTS.map(spotKey)).size).toBe(49);
		for (const spot of ROULETTE_SPOTS) expect(spotFromKey(spotKey(spot))).toEqual(spot);
	});

	/** The whole table rides in a custom ID, so every layout has to survive the trip and stay short. */
	it("packs any layout into ten characters and reads it back", () => {
		expect(decodeSpots(encodeSpots(ROULETTE_SPOTS))).toEqual(ROULETTE_SPOTS);
		expect(encodeSpots(ROULETTE_SPOTS).length).toBeLessThanOrEqual(10);
		expect(decodeSpots(encodeSpots([n(17), { kind: "odd" }, n(0)]))).toEqual([n(0), n(17), { kind: "odd" }]);
		expect(decodeSpots(encodeSpots([]))).toEqual([]);
	});

	it("refuses a mask no table could have made", () => {
		expect(decodeSpots("")).toBeNull();
		expect(decodeSpots("A1")).toBeNull();
		expect(decodeSpots("zzzzzzzzzz")).toBeNull();
		expect(decodeSpots("12345678901")).toBeNull();
	});

	it("names a few spots, and counts a crowded table", () => {
		expect(spotsLine([n(17)])).toBe("17");
		expect(spotsLine([{ kind: "red" }, n(17), { kind: "dozen1" }])).toBe("Red, 17 and 1st dozen (1–12)");
		expect(spotsLine(ROULETTE_SPOTS.slice(0, 7))).toBe("7 spots");
	});
});

describe("settling several bets on one spin", () => {
	it("pays each winning spot its own odds and loses the rest", () => {
		// 17 is black, odd, low, in the 2nd dozen and the 2nd column.
		const bets = [n(17), { kind: "red" }, { kind: "odd" }, { kind: "dozen2" }, { kind: "column2" }] as RouletteBet[];
		const { returned, winners } = settleSpots(bets, 10, 17);

		expect(winners).toEqual([n(17), { kind: "odd" }, { kind: "dozen2" }, { kind: "column2" }]);
		expect(returned).toBe(10 * 36 + 10 * 2 + 10 * 3 + 10 * 3);
	});

	it("loses every outside bet on zero, and pays a chip on zero itself", () => {
		const { returned, winners } = settleSpots([n(0), { kind: "red" }, { kind: "black" }], 10, 0);

		expect(winners).toEqual([n(0)]);
		expect(returned).toBe(360);
	});

	it("splits the stake evenly across the table and says how many won", () => {
		// Pocket index 23 on the wheel is 1: red, odd, low.
		const outcome = rouletteOutcome([{ kind: "red" }, { kind: "black" }, n(1)], 300, () => 23);

		expect(outcome.returned).toBe(100 * 2 + 100 * 36);
		expect(outcome.result).toContain("2 of your 3 bets won");
		expect(outcome.betLine).toBe("Red, Black and 1 · 100 each");
		expect(outcome.againStake).toBe(100);
	});
});

describe("the betting layout", () => {
	it("keeps every spot on the picture, and no two spots on top of each other", () => {
		const rects = ROULETTE_SPOTS.map(spotRect);
		for (const rect of rects) {
			expect(rect.x).toBeGreaterThanOrEqual(0);
			expect(rect.y).toBeGreaterThanOrEqual(0);
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

	it("lays the numbers out as a real table does, with 3 at the top left and 34 at the bottom right", () => {
		expect(spotRect(n(3)).y).toBeLessThan(spotRect(n(2)).y);
		expect(spotRect(n(2)).y).toBeLessThan(spotRect(n(1)).y);
		expect(spotRect(n(34)).x).toBeGreaterThan(spotRect(n(31)).x);
		expect(spotRect(n(34)).y).toBe(spotRect(n(1)).y);
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

	it("writes a chip's figure in four characters or fewer", () => {
		expect(chipLabel(950)).toBe("950");
		expect(chipLabel(1_500)).toBe("1.5K");
		expect(chipLabel(12_345)).toBe("12K");
		expect(chipLabel(3_000_000)).toBe("3M");
		for (const amount of [1, 999, 9_999, 99_999, 999_999, 1e10, 9.99e12]) {
			expect(chipLabel(amount).length).toBeLessThanOrEqual(4);
		}
	});
});

describe("the betting table's message", () => {
	const placed = { bets: [n(17), { kind: "red" }, n(30)] as RouletteBet[], chip: 250 };

	it("offers the outside bets and both halves of the numbers, each ticked where a chip already is", () => {
		const message = rouletteTableMessage(placed, OWNER);
		const menus = message.components[0]!.toJSON() as unknown as {
			components: { components?: { custom_id: string; options: { value: string; default?: boolean }[] }[] }[];
		};
		const selects = menus.components.flatMap((part) => part.components ?? []).filter((part) => "options" in part);

		expect(selects.map((menu) => parseCustomId(menu.custom_id).args[0])).toEqual(["o", "a", "b"]);
		expect(selects.map((menu) => menu.options.length)).toEqual([12, 19, 18]);
		const ticked = selects.flatMap((menu) => menu.options.filter((choice) => choice.default).map((c) => c.value));
		expect(ticked.sort()).toEqual(["n17", "n30", "red"]);
	});

	it("carries the layout and the chip on every control, with the player last", () => {
		const message = rouletteTableMessage(placed, OWNER);

		for (const id of customIdsOf(message)) {
			expect(id.length).toBeLessThanOrEqual(100);
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
		const spin = buttonsOf(message).find((found) => parseCustomId(String(found.custom_id)).action === "rt-spin");
		expect(parseCustomId(String(spin?.custom_id)).args).toEqual([encodeSpots(placed.bets), "250", OWNER]);
		expect(spin?.label).toBe("Spin · 750");
		expect(duplicateIds(message)).toEqual([]);
	});

	it("will not spin or clear an empty table", () => {
		const message = rouletteTableMessage({ bets: [], chip: 100 }, OWNER);
		const disabled = buttonsOf(message)
			.filter((found) => found.disabled === true)
			.map((found) => parseCustomId(String(found.custom_id)).action);

		expect(disabled.sort()).toEqual(["rt-clear", "rt-spin"]);
		expect(textOf(message)).toContain("Pick where to put your chips");
	});

	it("says what is on the table and that nothing is taken until the spin", () => {
		const text = textOf(rouletteTableMessage(placed, OWNER));

		expect(text).toContain("**3** spots");
		expect(text).toContain("**750** on the table");
		expect(text).toContain("Nothing is taken until you spin");
	});

	/** Discord refuses a message with more than 40 components, and a full table must still send. */
	it("stays within Discord's component limit with every spot covered", () => {
		const message = rouletteTableMessage({ bets: [...ROULETTE_SPOTS], chip: 5 }, OWNER);
		let count = 0;
		const walk = (node: unknown): void => {
			if (node === null || typeof node !== "object") return;
			const record = node as Record<string, unknown>;
			if (typeof record.type === "number") count += 1;
			for (const value of Object.values(record)) if (Array.isArray(value)) value.forEach(walk);
		};
		walk(message.components[0]!.toJSON());

		expect(count).toBeLessThanOrEqual(40);
	});

	it("files each spot under the menu that shows it", () => {
		expect(spotGroup({ kind: "odd" })).toBe("o");
		expect(spotGroup(n(0))).toBe("a");
		expect(spotGroup(n(18))).toBe("a");
		expect(spotGroup(n(19))).toBe("b");
	});
});
