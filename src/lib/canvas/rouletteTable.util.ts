import { type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import { blankCanvas, drawFelt } from "@lib/canvas/playingCards.util";
import { DISPLAY, drawText } from "@lib/canvas/text.util";
import { type RouletteBet } from "@lib/casino/casino.types";
import { betWins, pocketColour, ROULETTE_SPOTS, spotKey } from "@lib/casino/roulette.util";

/** The betting layout, with a chip on every spot a bet sits on and, once spun, the winners picked out. */

export const LAYOUT = {
	margin: 24,
	zeroWidth: 56,
	cell: 54,
	row: 58,
	columnWidth: 64,
	band: 46,
} as const;

const GRID_X = LAYOUT.margin + LAYOUT.zeroWidth;
const GRID_Y = LAYOUT.margin;
const GRID_HEIGHT = LAYOUT.row * 3;

export const BOARD_WIDTH = GRID_X + LAYOUT.cell * 12 + LAYOUT.columnWidth + LAYOUT.margin;
export const BOARD_HEIGHT = GRID_Y + GRID_HEIGHT + LAYOUT.band * 2 + LAYOUT.margin;

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
				? { x: middle.x, y: middle.y + 40, radius: 16 }
				: { x: middle.x, y: rect.y + rect.height - 15, radius: 13 };
		case "column1":
		case "column2":
		case "column3":
			return { x: middle.x, y: rect.y + rect.height - 15, radius: 13 };
		case "dozen1":
		case "dozen2":
		case "dozen3":
			return { x: middle.x + 62, y: middle.y, radius: 16 };
		case "red":
		case "black":
		case "odd":
		case "even":
		case "low":
		case "high":
			return { x: middle.x + 36, y: middle.y, radius: 15 };
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

type ChipState = "placed" | "won" | "lost";

const CHIP_FILL: Record<ChipState, string> = { placed: "#2f6fdc", won: "#e2a712", lost: "#5b6270" };

function drawChip(
	ctx: SKRSContext2D,
	spot: { x: number; y: number; radius: number },
	label: string,
	state: ChipState,
): void {
	const { x, y, radius } = spot;

	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 2;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fillStyle = CHIP_FILL[state];
	ctx.fill();
	ctx.restore();

	// The six edge marks every casino chip carries.
	ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
	ctx.lineWidth = radius < 15 ? 2.5 : 3;
	for (let mark = 0; mark < 6; mark += 1) {
		const angle = (mark / 6) * Math.PI * 2;
		ctx.beginPath();
		ctx.arc(x, y, radius - 2, angle - 0.18, angle + 0.18);
		ctx.stroke();
	}

	ctx.beginPath();
	ctx.arc(x, y, radius - 6, 0, Math.PI * 2);
	ctx.lineWidth = 1.2;
	ctx.stroke();

	drawText(ctx, label, x, y + 1, {
		size: radius < 15 ? (label.length > 3 ? 8 : 10) : label.length > 3 ? 10 : 12,
		weight: 700,
		colour: "#ffffff",
		align: "center",
	});
}

export interface RouletteBoardView {
	bets: readonly RouletteBet[];
	chip: number;
	/** Where the ball landed; absent while the bets are still being placed. */
	pocket?: number;
}

export function rouletteBoard(view: RouletteBoardView): Buffer {
	const { canvas, ctx } = blankCanvas(BOARD_WIDTH, BOARD_HEIGHT);
	drawFelt(ctx, BOARD_WIDTH, BOARD_HEIGHT);

	const placed = [...new Map(view.bets.map((bet) => [spotKey(bet), bet])).values()];
	const taken = new Set(placed.map(spotKey));

	for (const spot of ROULETTE_SPOTS) drawSpot(ctx, spot, taken.has(spotKey(spot)));

	if (view.pocket !== undefined) {
		const landed = spotRect({ kind: "number", number: view.pocket });
		ctx.save();
		ctx.shadowColor = GOLD;
		ctx.shadowBlur = 16;
		ctx.strokeStyle = GOLD;
		ctx.lineWidth = 4;
		roundedRect(ctx, landed.x + 2, landed.y + 2, landed.width - 4, landed.height - 4, 6);
		ctx.stroke();
		ctx.restore();
	}

	const label = chipLabel(view.chip);
	for (const bet of placed) {
		const pocket = view.pocket;
		const state: ChipState = pocket === undefined ? "placed" : betWins(bet, pocket) ? "won" : "lost";
		drawChip(ctx, chipSpot(bet), label, state);
	}

	return canvas.toBuffer("image/png");
}
