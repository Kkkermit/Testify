import { type SKRSContext2D } from "@napi-rs/canvas";
import {
	blankCanvas,
	CARD_HEIGHT,
	CARD_WIDTH,
	drawCard,
	drawFelt,
	drawPill,
	handSpacing,
} from "@lib/canvas/playingCards.util";
import { type Card } from "@lib/casino/casino.types";

/** The blackjack and hi-lo tables, drawn fresh for every decision. */

export const TABLE_WIDTH = 560;

/** A result laid across the table: green for money coming back, red for money gone, grey for a push. */
export interface TableBanner {
	text: string;
	tone: "win" | "lose" | "push";
}

const BANNER_FILL = { win: "#1f9d55", lose: "#b3242f", push: "#5b6270" } as const;

function drawBanner(ctx: SKRSContext2D, banner: TableBanner, y: number): void {
	ctx.font = "bold 22px sans-serif";
	const width = ctx.measureText(banner.text).width + 44;
	const x = TABLE_WIDTH - width - 24;

	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
	ctx.shadowBlur = 12;
	ctx.beginPath();
	ctx.roundRect(x, y - 22, width, 44, 22);
	ctx.fillStyle = BANNER_FILL[banner.tone];
	ctx.fill();
	ctx.restore();

	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(banner.text, x + width / 2, y + 1);
}

function drawHand(ctx: SKRSContext2D, cards: readonly (Card | null)[], x: number, y: number, room: number): void {
	const spacing = handSpacing(cards.length, room);
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

export function blackjackTable(table: BlackjackTable): Buffer {
	const height = 380;
	const { canvas, ctx } = blankCanvas(TABLE_WIDTH, height);
	drawFelt(ctx, TABLE_WIDTH, height);

	const room = TABLE_WIDTH - 240;
	const dealer = table.dealer.map((card, index) => (table.hideHole && index === 1 ? null : card));

	drawPill(ctx, `Dealer · ${table.dealerTotal}`, 28, 36);
	drawHand(ctx, dealer, 28, 56, room);

	drawPill(ctx, `You · ${table.playerTotal}`, 28, 214);
	drawHand(ctx, table.player, 28, 234, room);

	if (table.banner !== undefined) drawBanner(ctx, table.banner, height / 2);

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
	drawCard(ctx, table.current, 36, 36, CARD_WIDTH * scale, CARD_HEIGHT * scale);

	drawPill(ctx, `Pot · ×${table.multiplier.toFixed(2)}`, 196, 56, "rgba(214, 170, 60, 0.85)");

	const shown = table.history.slice(-HILO_HISTORY_SHOWN);
	if (shown.length > 0) {
		ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
		ctx.font = "bold 14px sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText("Earlier cards", 36, 236);

		shown.forEach((card, index) => {
			drawCard(ctx, card, 36 + index * 50, 252, CARD_WIDTH * 0.48, CARD_HEIGHT * 0.48);
		});
	}

	if (table.banner !== undefined) drawBanner(ctx, table.banner, 130);

	return canvas.toBuffer("image/png");
}
