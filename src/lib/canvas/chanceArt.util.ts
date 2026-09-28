import { type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import { type AnimationFrame, encodeAnimation } from "@lib/canvas/gif.util";
import { blankCanvas, drawFelt } from "@lib/canvas/playingCards.util";
import { DISPLAY, drawText } from "@lib/canvas/text.util";
import { type CoinSide } from "@lib/casino/casino.types";

/** The coin toss and the dice, each a short animation that plays once and lands on the result. */

export const COIN_SIZE = 240;
export const DICE_WIDTH = 320;
export const DICE_HEIGHT = 180;

export const TOSS = { frames: 26, frameMs: 45, halfTurns: 9 } as const;
export const TUMBLE = { frames: 18, frameMs: 55 } as const;

/** How wide the coin looks at a point in the toss, and which face is up: it turns edge-on between faces. */
export function coinAt(progress: number, landed: CoinSide): { width: number; side: CoinSide } {
	const eased = 1 - (1 - Math.min(1, Math.max(0, progress))) ** 2;
	const turned = eased * TOSS.halfTurns * Math.PI;
	const flips = Math.floor(turned / Math.PI + 0.5);
	const other: CoinSide = landed === "heads" ? "tails" : "heads";

	return {
		width: Math.abs(Math.cos(turned)),
		side: (TOSS.halfTurns - flips) % 2 === 0 ? landed : other,
	};
}

function drawCoin(ctx: SKRSContext2D, width: number, side: CoinSide, lift: number): void {
	const centre = COIN_SIZE / 2;
	drawFelt(ctx, COIN_SIZE, COIN_SIZE);

	ctx.beginPath();
	ctx.ellipse(centre, centre + 78, 60 - lift * 20, 10, 0, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
	ctx.fill();

	const radius = 76;
	const x = Math.max(0.04, width) * radius;
	const y = centre - lift * 26;

	ctx.save();
	ctx.beginPath();
	ctx.ellipse(centre, y, x, radius, 0, 0, Math.PI * 2);
	const gold = ctx.createRadialGradient(centre - x * 0.3, y - 30, 10, centre, y, radius);
	gold.addColorStop(0, side === "heads" ? "#ffe89a" : "#e8e8ee");
	gold.addColorStop(1, side === "heads" ? "#c08a1c" : "#8c8f9a");
	ctx.fillStyle = gold;
	ctx.fill();
	ctx.lineWidth = 5;
	ctx.strokeStyle = side === "heads" ? "#8a5e10" : "#5c5f69";
	ctx.stroke();

	if (width > 0.35) {
		ctx.translate(centre, y);
		ctx.scale(width, 1);
		drawText(ctx, side === "heads" ? "H" : "T", 0, 3, {
			size: 58,
			weight: 700,
			family: DISPLAY,
			colour: side === "heads" ? "#8a5e10" : "#4d505a",
			align: "center",
		});
	}
	ctx.restore();
}

export function coinStill(landed: CoinSide): Buffer {
	const { canvas, ctx } = blankCanvas(COIN_SIZE, COIN_SIZE);
	drawCoin(ctx, 1, landed, 0);

	return canvas.toBuffer("image/png");
}

export function coinToss(landed: CoinSide): { gif: Buffer; durationMs: number } {
	const frames: AnimationFrame[] = Array.from({ length: TOSS.frames }, (_, index) => {
		const progress = index / (TOSS.frames - 1);
		const coin = coinAt(progress, landed);

		return { draw: (ctx) => drawCoin(ctx, coin.width, coin.side, Math.sin(progress * Math.PI)), delay: TOSS.frameMs };
	});
	frames.push({ draw: (ctx) => drawCoin(ctx, 1, landed, 0), delay: 5_000 });

	return { gif: encodeAnimation(COIN_SIZE, COIN_SIZE, frames), durationMs: TOSS.frames * TOSS.frameMs };
}

/** Where the pips sit on a face, on a three-by-three grid. */
export const PIPS: Record<number, readonly (readonly [number, number])[]> = {
	1: [[1, 1]],
	2: [
		[0, 0],
		[2, 2],
	],
	3: [
		[0, 0],
		[1, 1],
		[2, 2],
	],
	4: [
		[0, 0],
		[2, 0],
		[0, 2],
		[2, 2],
	],
	5: [
		[0, 0],
		[2, 0],
		[1, 1],
		[0, 2],
		[2, 2],
	],
	6: [
		[0, 0],
		[2, 0],
		[0, 1],
		[2, 1],
		[0, 2],
		[2, 2],
	],
};

function drawDie(ctx: SKRSContext2D, face: number, x: number, y: number, size: number, turn: number): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(turn);
	ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
	ctx.shadowBlur = 10;
	ctx.shadowOffsetY = 4;
	roundedRect(ctx, -size / 2, -size / 2, size, size, size * 0.18);
	ctx.fillStyle = "#fbfaf6";
	ctx.fill();
	ctx.shadowColor = "transparent";

	ctx.fillStyle = face === 1 ? "#c8202c" : "#16161c";
	for (const [column, row] of PIPS[face] ?? []) {
		ctx.beginPath();
		ctx.arc((column - 1) * size * 0.28, (row - 1) * size * 0.28, size * 0.085, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}

function diceFrame(ctx: SKRSContext2D, faces: readonly [number, number], progress: number): void {
	drawFelt(ctx, DICE_WIDTH, DICE_HEIGHT);
	const settle = 1 - progress;

	faces.forEach((face, index) => {
		const x = DICE_WIDTH / 2 + (index === 0 ? -60 : 60) + Math.sin(progress * 11 + index) * 18 * settle;
		const y = DICE_HEIGHT / 2 + Math.cos(progress * 9 + index * 2) * 14 * settle;
		drawDie(ctx, face, x, y, 74, settle * (index === 0 ? 5 : -6));
	});
}

export function diceStill(dice: readonly [number, number]): Buffer {
	const { canvas, ctx } = blankCanvas(DICE_WIDTH, DICE_HEIGHT);
	diceFrame(ctx, dice, 1);

	return canvas.toBuffer("image/png");
}

/** The faces shown mid-tumble are decoration, cycled from the result so the same roll always animates the same way. */
export function diceRoll(dice: readonly [number, number]): { gif: Buffer; durationMs: number } {
	const frames: AnimationFrame[] = Array.from({ length: TUMBLE.frames }, (_, index) => {
		const progress = index / (TUMBLE.frames - 1);
		const faces: [number, number] =
			index === TUMBLE.frames - 1
				? [dice[0], dice[1]]
				: [((dice[0] + index * 5) % 6) + 1, ((dice[1] + index * 4) % 6) + 1];

		return { draw: (ctx) => diceFrame(ctx, faces, progress), delay: TUMBLE.frameMs };
	});
	frames.push({ draw: (ctx) => diceFrame(ctx, dice, 1), delay: 5_000 });

	return { gif: encodeAnimation(DICE_WIDTH, DICE_HEIGHT, frames), durationMs: TUMBLE.frames * TUMBLE.frameMs };
}
