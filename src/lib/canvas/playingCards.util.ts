import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import { drawText, measureText, type TextStyle } from "@lib/canvas/text.util";
import { isRed } from "@lib/casino/cards.util";
import { type Card, type Suit } from "@lib/casino/casino.types";

/** Playing cards and the felt they are dealt on; suits are drawn as shapes so no font needs the glyphs. */

export const CARD_WIDTH = 92;
export const CARD_HEIGHT = 128;

const RED = "#c8202c";
const BLACK = "#16161c";

export function drawSuit(ctx: SKRSContext2D, suit: Suit, x: number, y: number, size: number): void {
	const s = size / 2;
	ctx.save();
	ctx.translate(x, y);
	ctx.fillStyle = suit === "hearts" || suit === "diamonds" ? RED : BLACK;
	ctx.beginPath();

	const heart = (flip: number): void => {
		ctx.moveTo(0, s * 0.85 * flip);
		ctx.bezierCurveTo(-s * 1.1, s * 0.1 * flip, -s * 0.75, -s * 0.85 * flip, 0, -s * 0.35 * flip);
		ctx.bezierCurveTo(s * 0.75, -s * 0.85 * flip, s * 1.1, s * 0.1 * flip, 0, s * 0.85 * flip);
	};

	switch (suit) {
		case "hearts":
			heart(1);
			ctx.fill();
			break;
		case "diamonds":
			ctx.moveTo(0, -s);
			ctx.lineTo(s * 0.72, 0);
			ctx.lineTo(0, s);
			ctx.lineTo(-s * 0.72, 0);
			ctx.closePath();
			ctx.fill();
			break;
		case "spades":
			ctx.translate(0, -s * 0.12);
			heart(-1);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(0, s * 0.2);
			ctx.lineTo(s * 0.3, s * 1.0);
			ctx.lineTo(-s * 0.3, s * 1.0);
			ctx.closePath();
			ctx.fill();
			break;
		case "clubs":
			for (const [cx, cy] of [
				[0, -s * 0.45],
				[-s * 0.45, s * 0.12],
				[s * 0.45, s * 0.12],
			] as const) {
				ctx.moveTo(cx + s * 0.38, cy);
				ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
			}
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(s * 0.28, s * 0.98);
			ctx.lineTo(-s * 0.28, s * 0.98);
			ctx.closePath();
			ctx.fill();
			break;
	}

	ctx.restore();
}

function drawBack(ctx: SKRSContext2D, x: number, y: number, width: number, height: number): void {
	roundedRect(ctx, x + 6, y + 6, width - 12, height - 12, 6);
	ctx.fillStyle = "#1e3f8f";
	ctx.fill();

	ctx.save();
	ctx.clip();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
	ctx.lineWidth = 2;
	for (let line = -height; line < width + height; line += 10) {
		ctx.beginPath();
		ctx.moveTo(x + line, y);
		ctx.lineTo(x + line + height, y + height);
		ctx.moveTo(x + line + height, y);
		ctx.lineTo(x + line, y + height);
		ctx.stroke();
	}
	ctx.restore();
}

/** A card face up, or its back when `card` is null. */
export function drawCard(
	ctx: SKRSContext2D,
	card: Card | null,
	x: number,
	y: number,
	width = CARD_WIDTH,
	height = CARD_HEIGHT,
): void {
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
	ctx.shadowBlur = 10;
	ctx.shadowOffsetY = 4;
	roundedRect(ctx, x, y, width, height, 9);
	ctx.fillStyle = "#fbfaf6";
	ctx.fill();
	ctx.restore();

	roundedRect(ctx, x, y, width, height, 9);
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = "#c9c4b8";
	ctx.stroke();

	if (card === null) {
		drawBack(ctx, x, y, width, height);
		return;
	}

	const scale = width / CARD_WIDTH;
	const colour = isRed(card) ? RED : BLACK;
	const corner = (rotate: boolean): void => {
		ctx.save();
		if (rotate) {
			ctx.translate(x + width, y + height);
			ctx.rotate(Math.PI);
		} else {
			ctx.translate(x, y);
		}
		drawText(ctx, card.rank, 17 * scale, 21 * scale, {
			size: Math.round(24 * scale),
			weight: 700,
			colour,
			align: "center",
			maxWidth: 30 * scale,
			minSize: Math.round(16 * scale),
		});
		drawSuit(ctx, card.suit, 17 * scale, 42 * scale, 15 * scale);
		ctx.restore();
	};
	corner(false);
	corner(true);

	const face = card.rank === "J" || card.rank === "Q" || card.rank === "K";
	if (face) {
		drawText(ctx, card.rank, x + width / 2, y + height / 2 - 12 * scale, {
			size: Math.round(44 * scale),
			weight: 700,
			colour,
			align: "center",
		});
		drawSuit(ctx, card.suit, x + width / 2, y + height / 2 + 26 * scale, 22 * scale);
	} else {
		drawSuit(ctx, card.suit, x + width / 2, y + height / 2, (card.rank === "A" ? 46 : 38) * scale);
	}
}

export function drawFelt(ctx: SKRSContext2D, width: number, height: number): void {
	const felt = ctx.createRadialGradient(width / 2, height / 2, 30, width / 2, height / 2, width * 0.7);
	felt.addColorStop(0, "#1a6b4a");
	felt.addColorStop(1, "#0b3524");
	ctx.fillStyle = felt;
	ctx.fillRect(0, 0, width, height);

	roundedRect(ctx, 8, 8, width - 16, height - 16, 18);
	ctx.lineWidth = 2;
	ctx.strokeStyle = "rgba(255, 215, 106, 0.45)";
	ctx.stroke();
}

export interface PillOptions {
	/** Whether `x` is the pill's left edge or its centre. */
	align?: "left" | "center";
	/** The figure's colour; the label is always a quieter white. */
	accent?: string;
}

const PILL = { height: 32, padding: 14, gap: 8 } as const;
const PILL_LABEL: TextStyle = { size: 14, weight: 600, colour: "rgba(255, 255, 255, 0.72)" };

/** A dark rounded label with a figure beside it, used for totals and the pot; returns its width. */
export function drawPill(
	ctx: SKRSContext2D,
	label: string,
	value: string,
	x: number,
	y: number,
	options: PillOptions = {},
): number {
	const figure: TextStyle = { size: 19, weight: 700, colour: options.accent ?? "#ffffff" };
	const labelWidth = measureText(ctx, label, PILL_LABEL);
	const width = PILL.padding * 2 + labelWidth + PILL.gap + measureText(ctx, value, figure);
	const left = options.align === "center" ? x - width / 2 : x;

	roundedRect(ctx, left, y - PILL.height / 2, width, PILL.height, PILL.height / 2);
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
	ctx.stroke();

	drawText(ctx, label, left + PILL.padding, y, PILL_LABEL);
	drawText(ctx, value, left + PILL.padding + labelWidth + PILL.gap, y, figure);

	return width;
}

/** Cards overlap once a hand grows past what fits, so a long hand never runs off the table. */
export function handSpacing(count: number, room: number, width = CARD_WIDTH): number {
	if (count <= 1) return 0;

	return Math.min(width + 12, (room - width) / (count - 1));
}

export function blankCanvas(width: number, height: number): { canvas: Canvas; ctx: SKRSContext2D } {
	const canvas = createCanvas(width, height);

	return { canvas, ctx: canvas.getContext("2d") };
}
