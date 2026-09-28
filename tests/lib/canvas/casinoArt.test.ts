import { blackjackTable, handLayout, hiloTable, TABLE_WIDTH } from "@lib/canvas/cardTable.util";
import { coinAt, coinStill, coinToss, diceRoll, diceStill, PIPS } from "@lib/canvas/chanceArt.util";
import { onlyChanged } from "@lib/canvas/gif.util";
import { handSpacing } from "@lib/canvas/playingCards.util";
import {
	ballAt,
	POCKET_RADIUS,
	pocketAngle,
	rouletteSpin,
	rouletteStill,
	TRACK_RADIUS,
} from "@lib/canvas/rouletteWheel.util";
import { REELS_SPIN, reelOffset, reelStrip, slotsSpin, slotsStill } from "@lib/canvas/slotMachine.util";
import { type Card, type Reels } from "@lib/casino/casino.types";
import { WHEEL_ORDER } from "@lib/casino/roulette.util";

const GIF_HEADER = "GIF89a";
/** Discord refuses an upload over 10 MB, and a spin should be a small fraction of that. */
const ANIMATION_BUDGET = 1_500_000;

/** The Netscape block's loop count sits right after its name; a GIF that plays once has none. */
function loops(gif: Buffer): boolean {
	return gif.includes(Buffer.from("NETSCAPE2.0"));
}

const card = (rank: Card["rank"], suit: Card["suit"] = "hearts"): Card => ({ rank, suit });

describe("the roulette wheel", () => {
	it("puts zero at the top and each pocket a thirty-seventh of a turn apart", () => {
		expect(pocketAngle(0)).toBeCloseTo(-Math.PI / 2);
		expect(pocketAngle(WHEEL_ORDER[1])).toBeCloseTo(-Math.PI / 2 + (Math.PI * 2) / 37);
		expect(() => pocketAngle(37)).toThrow();
	});

	it("starts the ball on the track, turns before it drops", () => {
		const start = ballAt(0, 17);

		expect(start.radius).toBeCloseTo(TRACK_RADIUS);
		expect(start.angle - pocketAngle(17)).toBeCloseTo(4 * Math.PI * 2);
	});

	/** The picture has to agree with the money: the ball must come to rest in the pocket that was paid. */
	it("brings the ball to rest in the winning pocket", () => {
		for (const pocket of [0, 17, 26, 32]) {
			const end = ballAt(1, pocket);

			expect(end.angle).toBeCloseTo(pocketAngle(pocket));
			expect(end.radius).toBeCloseTo(POCKET_RADIUS);
		}
	});

	it("only slows down, never speeds up again", () => {
		const angles = Array.from({ length: 21 }, (_, step) => ballAt(step / 20, 5).angle);
		const moves = angles.slice(1).map((angle, index) => angles[index]! - angle);

		for (let index = 1; index < moves.length; index += 1)
			expect(moves[index]!).toBeLessThanOrEqual(moves[index - 1]! + 1e-9);
	});

	it("renders a spin that plays once, within budget", () => {
		const spin = rouletteSpin(17);

		expect(spin.gif.subarray(0, 6).toString()).toBe(GIF_HEADER);
		expect(loops(spin.gif)).toBe(false);
		expect(spin.gif.length).toBeLessThan(ANIMATION_BUDGET);
		expect(spin.durationMs).toBeGreaterThan(2_000);
		expect(rouletteStill(17).subarray(1, 4).toString()).toBe("PNG");
	});
});

describe("the slot machine", () => {
	it("scrolls each reel to its result and stops it there", () => {
		const reels: Reels = ["seven", "bar", "cherry"];

		reels.forEach((symbol, reel) => {
			const strip = reelStrip(reels, reel);
			const stop = REELS_SPIN.stops[reel]!;

			expect(strip[strip.length - 2]).toBe(symbol);
			expect(reelOffset(stop, reel, strip.length)).toBe(strip.length - 2);
			expect(reelOffset(stop + 5, reel, strip.length)).toBe(strip.length - 2);
		});
	});

	it("stops the reels left to right", () => {
		expect([...REELS_SPIN.stops]).toEqual([...REELS_SPIN.stops].sort((a, b) => a - b));
	});

	it("draws the same spin the same way twice", () => {
		const reels: Reels = ["lemon", "lemon", "star"];

		expect(reelStrip(reels, 1)).toEqual(reelStrip(reels, 1));
	});

	it("renders a spin that plays once, within budget", () => {
		const spin = slotsSpin(["diamond", "diamond", "diamond"]);

		expect(spin.gif.subarray(0, 6).toString()).toBe(GIF_HEADER);
		expect(loops(spin.gif)).toBe(false);
		expect(spin.gif.length).toBeLessThan(ANIMATION_BUDGET);
		expect(slotsStill(["cherry", "bar", "cherry"]).length).toBeGreaterThan(0);
	});
});

describe("the coin and the dice", () => {
	it("lands the coin face up on the side that was called, and flat", () => {
		for (const side of ["heads", "tails"] as const) expect(coinAt(1, side)).toEqual({ width: 1, side });
	});

	it("turns the coin edge-on between faces", () => {
		const widths = Array.from({ length: 40 }, (_, step) => coinAt(step / 39, "heads").width);

		expect(Math.min(...widths)).toBeLessThan(0.2);
	});

	it("has a pip layout for every face", () => {
		for (let face = 1; face <= 6; face += 1) expect(PIPS[face]).toHaveLength(face);
	});

	it("renders both animations and both stills", () => {
		expect(coinToss("tails").gif.subarray(0, 6).toString()).toBe(GIF_HEADER);
		expect(diceRoll([3, 4]).gif.subarray(0, 6).toString()).toBe(GIF_HEADER);
		expect(coinStill("heads").length).toBeGreaterThan(0);
		expect(diceStill([6, 6]).length).toBeGreaterThan(0);
	});
});

describe("the card tables", () => {
	it("overlaps a long hand rather than running off the table", () => {
		expect(handSpacing(1, 320)).toBe(0);
		expect(handSpacing(2, 320)).toBe(104);
		expect(92 + 7 * handSpacing(8, 320)).toBeLessThanOrEqual(320);
	});

	/** Hands were drawn from the left edge, so a short one sat off to the side of an empty table. */
	it("centres every hand on the table, however many cards it holds", () => {
		for (let count = 1; count <= 8; count += 1) {
			const { x, spacing } = handLayout(count, TABLE_WIDTH - 80);
			const right = x + spacing * (count - 1) + 92;

			expect(x).toBeGreaterThanOrEqual(40);
			expect(x).toBeCloseTo(TABLE_WIDTH - right);
		}
	});

	it("renders blackjack and hi-lo, banner or not", () => {
		expect(
			blackjackTable({
				dealer: [card("K"), card("7")],
				player: [card("A"), card("9")],
				hideHole: true,
				dealerTotal: "10",
				playerTotal: "20",
			})
				.subarray(1, 4)
				.toString(),
		).toBe("PNG");
		expect(
			blackjackTable({
				dealer: [card("K"), card("7"), card("2"), card("10", "spades")],
				player: [card("A"), card("9")],
				hideHole: false,
				dealerTotal: "19",
				playerTotal: "20",
				banner: { text: "You win", tone: "win" },
			}).length,
		).toBeGreaterThan(0);
		expect(
			hiloTable({ current: card("Q"), history: [card("2")], multiplier: 1.8, banner: { text: "Correct", tone: "win" } })
				.length,
		).toBeGreaterThan(0);
	});
});

describe("frame differencing", () => {
	it("leaves the first frame whole and marks unchanged pixels transparent after", () => {
		const first = Uint8Array.from([1, 2, 3]);

		expect(onlyChanged(first, null)).toBe(first);
		expect([...onlyChanged(Uint8Array.from([1, 9, 3]), first)]).toEqual([255, 9, 255]);
	});
});
