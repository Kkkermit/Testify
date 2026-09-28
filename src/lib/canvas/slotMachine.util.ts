import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import { type AnimationFrame, encodeAnimation } from "@lib/canvas/gif.util";
import { DISPLAY, drawText } from "@lib/canvas/text.util";
import { type Reels, type SlotSymbol } from "@lib/casino/casino.types";
import { SLOT_SYMBOLS, slotsReturn } from "@lib/casino/slots.util";

/** A three-reel machine; every symbol is drawn as a shape, so it needs no emoji font on the host. */

export const SLOTS_WIDTH = 440;
export const SLOTS_HEIGHT = 250;

const WINDOW = { top: 40, height: 170, width: 120, gap: 16 } as const;
const CELL = 84;
const FIRST_WINDOW = (SLOTS_WIDTH - (WINDOW.width * 3 + WINDOW.gap * 2)) / 2;

export const REELS_SPIN = {
	frameMs: 50,
	/** The frame each reel comes to rest on, left to right. */
	stops: [24, 34, 44],
	/** How many symbols go past before the first reel stops. */
	travel: 14,
} as const;

/** Decoration only: the symbols blurring past are chosen from the result, so the same spin draws the same frames. */
function filler(reels: Reels, reel: number, count: number): SlotSymbol[] {
	let seed = reels.reduce((total, symbol, index) => total * 7 + SLOT_SYMBOLS.indexOf(symbol) + index, reel + 1);

	return Array.from({ length: count }, () => {
		seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
		return SLOT_SYMBOLS[seed % SLOT_SYMBOLS.length]!;
	});
}

/** The strip a reel scrolls through: filler, then the symbol above the line, the result, and the one below. */
export function reelStrip(reels: Reels, reel: number): SlotSymbol[] {
	const length = REELS_SPIN.travel + reel * 6;
	const strip = filler(reels, reel, length + 2);
	strip[length] = reels[reel]!;

	return strip;
}

/** How far down its strip a reel has scrolled at a frame, easing into its stop with a small overshoot. */
export function reelOffset(frame: number, reel: number, stripLength: number): number {
	const stop = REELS_SPIN.stops[reel]!;
	const target = stripLength - 2;
	if (frame >= stop) return target;

	const progress = frame / stop;
	const eased = 1 - (1 - progress) ** 2.4;

	return Math.min(target + 0.12, eased * (target + 0.12));
}

function drawSymbol(ctx: SKRSContext2D, symbol: SlotSymbol, x: number, y: number, size: number): void {
	ctx.save();
	ctx.translate(x, y);
	const s = size / 2;

	switch (symbol) {
		case "cherry": {
			ctx.strokeStyle = "#2f8a3a";
			ctx.lineWidth = s * 0.12;
			ctx.beginPath();
			ctx.moveTo(-s * 0.35, s * 0.2);
			ctx.quadraticCurveTo(-s * 0.1, -s * 0.5, s * 0.25, -s * 0.75);
			ctx.moveTo(s * 0.35, s * 0.25);
			ctx.quadraticCurveTo(s * 0.3, -s * 0.3, s * 0.25, -s * 0.75);
			ctx.stroke();
			for (const [cx, cy] of [
				[-s * 0.38, s * 0.38],
				[s * 0.38, s * 0.42],
			] as const) {
				ctx.beginPath();
				ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2);
				ctx.fillStyle = "#d6232f";
				ctx.fill();
				ctx.beginPath();
				ctx.arc(cx - s * 0.12, cy - s * 0.12, s * 0.09, 0, Math.PI * 2);
				ctx.fillStyle = "#ff9ea3";
				ctx.fill();
			}
			break;
		}
		case "lemon": {
			ctx.beginPath();
			ctx.ellipse(0, 0, s * 0.8, s * 0.55, -0.35, 0, Math.PI * 2);
			ctx.fillStyle = "#f5d130";
			ctx.fill();
			ctx.lineWidth = s * 0.06;
			ctx.strokeStyle = "#c9a312";
			ctx.stroke();
			ctx.beginPath();
			ctx.ellipse(-s * 0.2, -s * 0.18, s * 0.25, s * 0.1, -0.35, 0, Math.PI * 2);
			ctx.fillStyle = "#fff3a6";
			ctx.fill();
			break;
		}
		case "bell": {
			ctx.beginPath();
			ctx.moveTo(-s * 0.7, s * 0.45);
			ctx.quadraticCurveTo(-s * 0.55, s * 0.3, -s * 0.5, -s * 0.2);
			ctx.quadraticCurveTo(-s * 0.45, -s * 0.72, 0, -s * 0.72);
			ctx.quadraticCurveTo(s * 0.45, -s * 0.72, s * 0.5, -s * 0.2);
			ctx.quadraticCurveTo(s * 0.55, s * 0.3, s * 0.7, s * 0.45);
			ctx.closePath();
			ctx.fillStyle = "#f2b72c";
			ctx.fill();
			ctx.lineWidth = s * 0.07;
			ctx.strokeStyle = "#b07a10";
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, s * 0.58, s * 0.16, 0, Math.PI * 2);
			ctx.fillStyle = "#b07a10";
			ctx.fill();
			break;
		}
		case "bar": {
			roundedRect(ctx, -s * 0.85, -s * 0.38, s * 1.7, s * 0.76, s * 0.14);
			ctx.fillStyle = "#1c1c24";
			ctx.fill();
			ctx.lineWidth = s * 0.07;
			ctx.strokeStyle = "#d9b44a";
			ctx.stroke();
			drawText(ctx, "BAR", 0, s * 0.03, {
				size: Math.round(s * 0.55),
				weight: 700,
				family: DISPLAY,
				colour: "#ffffff",
				align: "center",
			});
			break;
		}
		case "star": {
			ctx.beginPath();
			for (let point = 0; point < 10; point += 1) {
				const radius = point % 2 === 0 ? s * 0.85 : s * 0.38;
				const angle = -Math.PI / 2 + (point * Math.PI) / 5;
				ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
			}
			ctx.closePath();
			ctx.fillStyle = "#ffcf33";
			ctx.fill();
			ctx.lineWidth = s * 0.07;
			ctx.strokeStyle = "#d9861a";
			ctx.stroke();
			break;
		}
		case "seven": {
			drawText(ctx, "7", 0, s * 0.05, {
				size: Math.round(s * 1.7),
				weight: 700,
				family: DISPLAY,
				colour: "#e3262f",
				align: "center",
				outline: { colour: "#5a0b10", width: s * 0.14 },
			});
			break;
		}
		case "diamond": {
			ctx.beginPath();
			ctx.moveTo(-s * 0.8, -s * 0.25);
			ctx.lineTo(-s * 0.45, -s * 0.65);
			ctx.lineTo(s * 0.45, -s * 0.65);
			ctx.lineTo(s * 0.8, -s * 0.25);
			ctx.lineTo(0, s * 0.8);
			ctx.closePath();
			ctx.fillStyle = "#38c6f4";
			ctx.fill();
			ctx.lineWidth = s * 0.06;
			ctx.strokeStyle = "#136e9a";
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-s * 0.8, -s * 0.25);
			ctx.lineTo(s * 0.8, -s * 0.25);
			ctx.moveTo(-s * 0.2, -s * 0.65);
			ctx.lineTo(0, s * 0.8);
			ctx.lineTo(s * 0.2, -s * 0.65);
			ctx.stroke();
			break;
		}
	}

	ctx.restore();
}

function drawCabinet(ctx: SKRSContext2D): void {
	const body = ctx.createLinearGradient(0, 0, 0, SLOTS_HEIGHT);
	body.addColorStop(0, "#7a1020");
	body.addColorStop(1, "#3a0610");
	ctx.fillStyle = body;
	ctx.fillRect(0, 0, SLOTS_WIDTH, SLOTS_HEIGHT);

	drawText(ctx, "SLOTS", SLOTS_WIDTH / 2, 21, {
		size: 22,
		weight: 700,
		family: DISPLAY,
		colour: "#ffd76a",
		align: "center",
	});
	drawSymbol(ctx, "star", SLOTS_WIDTH / 2 - 60, 21, 20);
	drawSymbol(ctx, "star", SLOTS_WIDTH / 2 + 60, 21, 20);
}

function windowX(reel: number): number {
	return FIRST_WINDOW + reel * (WINDOW.width + WINDOW.gap);
}

function drawReel(ctx: SKRSContext2D, strip: readonly SlotSymbol[], offset: number, reel: number): void {
	const x = windowX(reel);
	const middle = WINDOW.top + WINDOW.height / 2;

	ctx.save();
	roundedRect(ctx, x, WINDOW.top, WINDOW.width, WINDOW.height, 10);
	const glass = ctx.createLinearGradient(0, WINDOW.top, 0, WINDOW.top + WINDOW.height);
	glass.addColorStop(0, "#c9c3b8");
	glass.addColorStop(0.5, "#fbf8f1");
	glass.addColorStop(1, "#c9c3b8");
	ctx.fillStyle = glass;
	ctx.fill();
	ctx.clip();

	const base = Math.floor(offset);
	for (let cell = base - 2; cell <= base + 2; cell += 1) {
		const symbol = strip[((cell % strip.length) + strip.length) % strip.length]!;
		drawSymbol(ctx, symbol, x + WINDOW.width / 2, middle + (cell - offset) * CELL, 62);
	}
	ctx.restore();

	roundedRect(ctx, x, WINDOW.top, WINDOW.width, WINDOW.height, 10);
	ctx.lineWidth = 4;
	ctx.strokeStyle = "#d9b44a";
	ctx.stroke();
}

function drawPayline(ctx: SKRSContext2D, won: boolean): void {
	const y = WINDOW.top + WINDOW.height / 2;
	ctx.save();
	if (won) {
		ctx.shadowColor = "#ffd76a";
		ctx.shadowBlur = 12;
	}
	ctx.strokeStyle = won ? "#ffd76a" : "rgba(255, 215, 106, 0.55)";
	ctx.lineWidth = won ? 4 : 2;
	ctx.beginPath();
	ctx.moveTo(FIRST_WINDOW - 8, y);
	ctx.lineTo(SLOTS_WIDTH - FIRST_WINDOW + 8, y);
	ctx.stroke();
	ctx.restore();
}

function slotsFrame(ctx: SKRSContext2D, reels: Reels, strips: readonly SlotSymbol[][], frame: number): void {
	drawCabinet(ctx);
	strips.forEach((strip, reel) => {
		drawReel(ctx, strip, reelOffset(frame, reel, strip.length), reel);
	});

	const finished = frame >= REELS_SPIN.stops[2];
	drawPayline(ctx, finished && slotsReturn(reels) > 0);
}

export function slotsStill(reels: Reels): Buffer {
	const canvas = createCanvas(SLOTS_WIDTH, SLOTS_HEIGHT);
	const strips = [0, 1, 2].map((reel) => reelStrip(reels, reel));
	slotsFrame(canvas.getContext("2d"), reels, strips, REELS_SPIN.stops[2]);

	return canvas.toBuffer("image/png");
}

export function slotsSpin(reels: Reels): { gif: Buffer; durationMs: number } {
	const strips = [0, 1, 2].map((reel) => reelStrip(reels, reel));
	const last = REELS_SPIN.stops[2];

	const frames: AnimationFrame[] = Array.from({ length: last + 1 }, (_, frame) => ({
		draw: (ctx) => slotsFrame(ctx, reels, strips, frame),
		delay: frame === last ? 5_000 : REELS_SPIN.frameMs,
	}));

	return { gif: encodeAnimation(SLOTS_WIDTH, SLOTS_HEIGHT, frames), durationMs: last * REELS_SPIN.frameMs };
}
