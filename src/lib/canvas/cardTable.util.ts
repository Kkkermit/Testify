import { type SKRSContext2D } from "@napi-rs/canvas";
import { roundedRect } from "@lib/canvas/canvas.util";
import {
	blankCanvas,
	CARD_HEIGHT,
	CARD_WIDTH,
	drawCard,
	drawFelt,
	drawPill,
	handSpacing,
} from "@lib/canvas/playingCards.util";
import { DISPLAY, drawText, measureText, type TextStyle } from "@lib/canvas/text.util";
import { type Card } from "@lib/casino/casino.types";

/** The blackjack and hi-lo tables, drawn fresh for every decision. */

export const TABLE_WIDTH = 560;

/** A result laid across the table: green for money coming back, red for money gone, grey for a push. */
export interface TableBanner {
	text: string;
	tone: "win" | "lose" | "push";
}

const BANNER_FILL = { win: "#1f9d55", lose: "#b3242f", push: "#5b6270" } as const;
const BANNER_TEXT: TextStyle = { size: 22, weight: 700, family: DISPLAY, colour: "#ffffff" };
const GOLD = "#ffd76a";

/** Centred on `x`, `y`. */
function drawBanner(ctx: SKRSContext2D, banner: TableBanner, x: number, y: number): void {
	const width = measureText(ctx, banner.text, BANNER_TEXT) + 56;

	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
	ctx.shadowBlur = 14;
	ctx.shadowOffsetY = 3;
	roundedRect(ctx, x - width / 2, y - 23, width, 46, 23);
	ctx.fillStyle = BANNER_FILL[banner.tone];
	ctx.fill();
	ctx.restore();

	roundedRect(ctx, x - width / 2, y - 23, width, 46, 23);
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
	ctx.stroke();

	drawText(ctx, banner.text, x, y + 1, { ...BANNER_TEXT, align: "center" });
}

/** Where a hand starts so it sits centred on the table, and how far apart its cards are. */
export function handLayout(count: number, room: number, tableWidth = TABLE_WIDTH): { x: number; spacing: number } {
	const spacing = handSpacing(count, room);
	const width = CARD_WIDTH + spacing * Math.max(count - 1, 0);

	return { x: (tableWidth - width) / 2, spacing };
}

function drawHand(ctx: SKRSContext2D, cards: readonly (Card | null)[], y: number, room: number): void {
	const { x, spacing } = handLayout(cards.length, room);
	cards.forEach((card, index) => {
		drawCard(ctx, card, x + index * spacing, y);
	});
}

export interface BlackjackTable {
	dealer: readonly Card[];
	player: readonly Card[];
	/** While the player is still deciding, the dealer's second card stays face down. */
	hideHole: boolean;
	dealerTotal: string;
	playerTotal: string;
	banner?: TableBanner;
}

// The dealer sits across the table from the player, so their label is at the top and the player's at the bottom.
const BLACKJACK = { height: 440, dealerLabel: 34, dealerCards: 58, middle: 222, playerCards: 258, playerLabel: 410 };
export const BLACKJACK_RULES = "BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON 17";

export function blackjackTable(table: BlackjackTable): Buffer {
	const { canvas, ctx } = blankCanvas(TABLE_WIDTH, BLACKJACK.height);
	drawFelt(ctx, TABLE_WIDTH, BLACKJACK.height);

	const room = TABLE_WIDTH - 80;
	const centre = TABLE_WIDTH / 2;
	const dealer = table.dealer.map((card, index) => (table.hideHole && index === 1 ? null : card));

	drawPill(ctx, "Dealer", table.dealerTotal, centre, BLACKJACK.dealerLabel, { align: "center" });
	drawHand(ctx, dealer, BLACKJACK.dealerCards, room);

	if (table.banner === undefined) {
		drawText(ctx, BLACKJACK_RULES, centre, BLACKJACK.middle, {
			size: 13,
			weight: 700,
			colour: "rgba(255, 215, 106, 0.55)",
			align: "center",
		});
	} else {
		drawBanner(ctx, table.banner, centre, BLACKJACK.middle);
	}

	drawHand(ctx, table.player, BLACKJACK.playerCards, room);
	drawPill(ctx, "You", table.playerTotal, centre, BLACKJACK.playerLabel, { align: "center" });

	return canvas.toBuffer("image/png");
}

export interface HiLoTable {
	current: Card;
	history: readonly Card[];
	multiplier: number;
	banner?: TableBanner;
}

/** How many earlier cards fit along the bottom of the hi-lo table. */
export const HILO_HISTORY_SHOWN = 7;

export function hiloTable(table: HiLoTable): Buffer {
	const height = 330;
	const { canvas, ctx } = blankCanvas(TABLE_WIDTH, height);
	drawFelt(ctx, TABLE_WIDTH, height);

	const scale = 1.25;
	const cardRight = 36 + CARD_WIDTH * scale;
	drawCard(ctx, table.current, 36, 36, CARD_WIDTH * scale, CARD_HEIGHT * scale);

	// The pot and the result share the space beside the card, both centred in it.
	const beside = (cardRight + TABLE_WIDTH - 24) / 2;
	drawPill(ctx, "Pot", `×${table.multiplier.toFixed(2)}`, beside, 76, { align: "center", accent: GOLD });
	if (table.banner !== undefined) drawBanner(ctx, table.banner, beside, 146);

	const shown = table.history.slice(-HILO_HISTORY_SHOWN);
	if (shown.length > 0) {
		drawText(ctx, "Earlier cards", 36, 236, { size: 14, weight: 600, colour: "rgba(255, 255, 255, 0.75)" });

		shown.forEach((card, index) => {
			drawCard(ctx, card, 36 + index * 50, 252, CARD_WIDTH * 0.48, CARD_HEIGHT * 0.48);
		});
	}

	return canvas.toBuffer("image/png");
}
