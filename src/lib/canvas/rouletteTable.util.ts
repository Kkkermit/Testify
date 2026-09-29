import { type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import { blankCanvas, drawFelt } from "@lib/canvas/playingCards.util";
import { DISPLAY, drawText } from "@lib/canvas/text.util";
import { SEAT_COLOURS } from "@lib/casino/casino.constants";
import { type RouletteBet } from "@lib/casino/casino.types";
import { betWins, pocketColour, ROULETTE_SPOTS, spotKey } from "@lib/casino/roulette.util";

/** The betting layout, with a chip on every spot a bet sits on and, once spun, the winners picked out. */

export const LAYOUT = {
	margin: 24,
	zeroWidth: 56,
	cell: 54,
	row: 72,
	columnWidth: 64,
	band: 50,
} as const;

const GRID_X = LAYOUT.margin + LAYOUT.zeroWidth;
const GRID_Y = LAYOUT.margin;
const GRID_HEIGHT = LAYOUT.row * 3;

export const BOARD_WIDTH = GRID_X + LAYOUT.cell * 12 + LAYOUT.columnWidth + LAYOUT.margin;
export const BOARD_HEIGHT = GRID_Y + GRID_HEIGHT + LAYOUT.band * 2 + LAYOUT.margin;
/** The strip above the table that shows the last spins, when there are any. */
export const HISTORY_BAND = 64;

/** The board is taller by the history strip only when it has spins to show. */
export function boardHeight(history: readonly number[]): number {
	return BOARD_HEIGHT + (history.length > 0 ? HISTORY_BAND : 0);
}

const FILL = { red: "#c0262d", black: "#17181c", green: "#16813d" } as const;
const LINE = "rgba(255, 255, 255, 0.55)";
const GOLD = "#ffd76a";

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** The even-money bets along the bottom band, two columns of the grid each. */
const OUTSIDE_ROW: RouletteBet["kind"][] = ["low", "even", "red", "black", "odd", "high"];
const OUTSIDE_LABEL: Partial<Record<RouletteBet["kind"], string>> = {
	low: "1–18",
	even: "EVEN",
	odd: "ODD",
	high: "19–36",
	dozen1: "1st 12",
	dozen2: "2nd 12",
	dozen3: "3rd 12",
	column1: "2 to 1",
	column2: "2 to 1",
	column3: "2 to 1",
};

/** Where a spot sits on the layout: numbers in three rows with 3, 6, 9… along the top, as on a real table. */
export function spotRect(bet: RouletteBet): Rect {
	switch (bet.kind) {
		case "number": {
			const number = bet.number ?? 0;
			if (number === 0) return { x: LAYOUT.margin, y: GRID_Y, width: LAYOUT.zeroWidth, height: GRID_HEIGHT };
			const column = Math.floor((number - 1) / 3);
			const row = 2 - ((number - 1) % 3);
			return { x: GRID_X + column * LAYOUT.cell, y: GRID_Y + row * LAYOUT.row, width: LAYOUT.cell, height: LAYOUT.row };
		}
		case "column1":
		case "column2":
		case "column3": {
			const row = 3 - Number(bet.kind.slice(-1));
			return {
				x: GRID_X + LAYOUT.cell * 12,
				y: GRID_Y + row * LAYOUT.row,
				width: LAYOUT.columnWidth,
				height: LAYOUT.row,
			};
		}
		case "dozen1":
		case "dozen2":
		case "dozen3": {
			const dozen = Number(bet.kind.slice(-1)) - 1;
			return {
				x: GRID_X + dozen * LAYOUT.cell * 4,
				y: GRID_Y + GRID_HEIGHT,
				width: LAYOUT.cell * 4,
				height: LAYOUT.band,
			};
		}
		case "red":
		case "black":
		case "odd":
		case "even":
		case "low":
		case "high": {
			const index = OUTSIDE_ROW.indexOf(bet.kind);
			return {
				x: GRID_X + index * LAYOUT.cell * 2,
				y: GRID_Y + GRID_HEIGHT + LAYOUT.band,
				width: LAYOUT.cell * 2,
				height: LAYOUT.band,
			};
		}
	}
}

/** A chip's figure in four characters or fewer: 950, 1.5K, 12K, 3M. */
export function chipLabel(amount: number): string {
	const units: [number, string][] = [
		[1e12, "T"],
		[1e9, "B"],
		[1e6, "M"],
		[1e3, "K"],
	];
	for (const [size, suffix] of units) {
		if (amount >= size) {
			const scaled = amount / size;
			return `${scaled >= 10 ? String(Math.floor(scaled)) : String(Math.floor(scaled * 10) / 10)}${suffix}`;
		}
	}
	return String(amount);
}

function centre(rect: Rect): { x: number; y: number } {
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function drawDiamond(ctx: SKRSContext2D, x: number, y: number, fill: string): void {
	ctx.beginPath();
	ctx.moveTo(x, y - 13);
	ctx.lineTo(x + 20, y);
	ctx.lineTo(x, y + 13);
	ctx.lineTo(x - 20, y);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = LINE;
	ctx.lineWidth = 1;
	ctx.stroke();
}

/** Where a spot's chip sits and how big it is: under a number, or beside a label, so neither hides the other. */
export function chipSpot(bet: RouletteBet): { x: number; y: number; radius: number } {
	const rect = spotRect(bet);
	const middle = centre(rect);

	switch (bet.kind) {
		case "number":
			return (bet.number ?? 0) === 0
				? { x: middle.x, y: middle.y + 44, radius: 20 }
				: { x: middle.x, y: rect.y + rect.height - 23, radius: 18 };
		case "column1":
		case "column2":
		case "column3":
			return { x: middle.x, y: rect.y + rect.height - 23, radius: 18 };
		case "dozen1":
		case "dozen2":
		case "dozen3":
			return { x: middle.x + 66, y: middle.y, radius: 19 };
		case "red":
		case "black":
		case "odd":
		case "even":
		case "low":
		case "high":
			return { x: middle.x + 32, y: middle.y, radius: 19 };
	}
}

/** `raised` lifts a label out of the way of the chip below it. */
function drawSpot(ctx: SKRSContext2D, bet: RouletteBet, raised: boolean): void {
	const rect = spotRect(bet);
	const middle = centre(rect);
	const labelY =
		raised && chipSpot(bet).y > middle.y
			? rect.y + (bet.kind === "number" && bet.number === 0 ? rect.height / 2 - 10 : 18)
			: middle.y + 1;
	const shift = raised && chipSpot(bet).x > middle.x ? -18 : 0;

	if (bet.kind === "number") {
		const number = bet.number ?? 0;
		ctx.fillStyle = FILL[pocketColour(number)];
		ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
		drawText(ctx, String(number), middle.x, labelY, {
			size: raised ? 18 : 22,
			weight: 700,
			family: DISPLAY,
			colour: "#ffffff",
			align: "center",
		});
	} else if (bet.kind === "red" || bet.kind === "black") {
		drawDiamond(ctx, middle.x + shift, middle.y, FILL[bet.kind]);
	} else {
		drawText(ctx, OUTSIDE_LABEL[bet.kind] ?? "", middle.x + shift, labelY, {
			size: raised && bet.kind.startsWith("column") ? 14 : 17,
			weight: 700,
			colour: "#f4efe3",
			align: "center",
		});
	}

	ctx.strokeStyle = LINE;
	ctx.lineWidth = 1.5;
	ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

/** One chip on the table: whose it is, by seat, and what it is worth. */
export interface BoardChip {
	bet: RouletteBet;
	amount: number;
	seat: number;
}

export interface RouletteBoardView {
	chips: readonly BoardChip[];
	/** Where the ball landed; absent while bets are still going down. */
	pocket?: number;
	/** Earlier spins at this table, newest first. */
	history?: readonly number[];
}

const HISTORY_LABEL_WIDTH = 118;

/** Where each earlier spin's disc sits in the strip, newest first and a little larger. */
export function historySpots(count: number): { x: number; y: number; radius: number }[] {
	const y = LAYOUT.margin / 2 + HISTORY_BAND / 2;
	return Array.from({ length: count }, (_, index) => ({
		x: LAYOUT.margin + HISTORY_LABEL_WIDTH + 26 + index * 54,
		y,
		radius: index === 0 ? 23 : 20,
	}));
}

function drawHistory(ctx: SKRSContext2D, history: readonly number[]): void {
	const spots = historySpots(history.length);
	drawText(ctx, "LAST SPINS", LAYOUT.margin, spots[0]?.y ?? 0, {
		size: 15,
		weight: 700,
		colour: "#f4efe3",
	});

	history.forEach((pocket, index) => {
		const spot = spots[index]!;
		ctx.save();
		ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
		ctx.shadowBlur = 6;
		ctx.beginPath();
		ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
		ctx.fillStyle = FILL[pocketColour(pocket)];
		ctx.fill();
		ctx.restore();

		ctx.lineWidth = index === 0 ? 3 : 1.5;
		ctx.strokeStyle = index === 0 ? GOLD : LINE;
		ctx.stroke();
		drawText(ctx, String(pocket), spot.x, spot.y + 1, {
			size: index === 0 ? 20 : 17,
			weight: 700,
			family: DISPLAY,
			colour: "#ffffff",
			align: "center",
		});
	});
}

/** The most chips drawn on one spot; the figure on top is the whole spot's total. */
const STACK_SHOWN = 3;

function seatFill(seat: number): string {
	return SEAT_COLOURS[seat % SEAT_COLOURS.length]!.fill;
}

function drawChip(
	ctx: SKRSContext2D,
	spot: { x: number; y: number; radius: number },
	fill: string,
	label: string | null,
): void {
	const { x, y, radius } = spot;

	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 2;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.restore();

	// The six edge marks every casino chip carries.
	ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
	ctx.lineWidth = 3.5;
	for (let mark = 0; mark < 6; mark += 1) {
		const angle = (mark / 6) * Math.PI * 2;
		ctx.beginPath();
		ctx.arc(x, y, radius - 2, angle - 0.2, angle + 0.2);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.arc(x, y, radius - 6, 0, Math.PI * 2);
	ctx.lineWidth = 1.2;
	ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
	ctx.stroke();

	if (label !== null) {
		drawText(ctx, label, x, y + 1, {
			size: label.length > 3 ? 12 : 14,
			weight: 700,
			colour: "#ffffff",
			align: "center",
			outline: { colour: "rgba(0, 0, 0, 0.75)", width: 3 },
		});
	}
}

/** The chips grouped by spot, in the order they went down. */
export function chipStacks(chips: readonly BoardChip[]): { bet: RouletteBet; total: number; seats: number[] }[] {
	const stacks = new Map<string, { bet: RouletteBet; total: number; seats: number[] }>();
	for (const chip of chips) {
		const key = spotKey(chip.bet);
		const stack = stacks.get(key) ?? { bet: chip.bet, total: 0, seats: [] };
		stack.total += chip.amount;
		stack.seats.push(chip.seat);
		stacks.set(key, stack);
	}
	return [...stacks.values()];
}

export function rouletteBoard(view: RouletteBoardView): Buffer {
	const history = view.history ?? [];
	const height = boardHeight(history);
	const { canvas, ctx } = blankCanvas(BOARD_WIDTH, height);
	drawFelt(ctx, BOARD_WIDTH, height);

	if (history.length > 0) {
		drawHistory(ctx, history);
		// Everything below keeps its own coordinates, moved down under the strip.
		ctx.translate(0, HISTORY_BAND);
	}

	const stacks = chipStacks(view.chips);
	const taken = new Set(stacks.map((stack) => spotKey(stack.bet)));
	for (const spot of ROULETTE_SPOTS) drawSpot(ctx, spot, taken.has(spotKey(spot)));

	const { pocket } = view;
	if (pocket !== undefined) {
		const landed = spotRect({ kind: "number", number: pocket });
		ctx.save();
		ctx.shadowColor = GOLD;
		ctx.shadowBlur = 16;
		ctx.strokeStyle = GOLD;
		ctx.lineWidth = 4;
		roundedRect(ctx, landed.x + 2, landed.y + 2, landed.width - 4, landed.height - 4, 6);
		ctx.stroke();
		ctx.restore();
	}

	for (const stack of stacks) {
		const spot = chipSpot(stack.bet);
		const won = pocket === undefined ? null : betWins(stack.bet, pocket);
		const shown = stack.seats.slice(-STACK_SHOWN);

		ctx.save();
		if (won === false) ctx.globalAlpha = 0.4;
		// Earlier chips peek out to the left of the one on top, which carries the spot's total.
		shown.forEach((seat, index) => {
			const depth = shown.length - 1 - index;
			const top = depth === 0;
			drawChip(ctx, { ...spot, x: spot.x - depth * 4 }, seatFill(seat), top ? chipLabel(stack.total) : null);
		});
		ctx.restore();

		if (won === true) {
			ctx.save();
			ctx.shadowColor = GOLD;
			ctx.shadowBlur = 12;
			ctx.strokeStyle = GOLD;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(spot.x, spot.y, spot.radius + 3, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
	}

	return canvas.toBuffer("image/png");
}
