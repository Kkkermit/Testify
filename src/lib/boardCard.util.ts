import { type AttachmentBuilder } from "discord.js";
import { createCanvas, drawAvatarOrInitial, fitFont, roundedRect, toAttachment } from "@lib/canvas.util";

/** A leaderboard, drawn rather than listed. */

const WIDTH = 900;
const HEADER = 96;
const ROW_HEIGHT = 84;
const PADDING = 24;
const PALETTE = {
	backdropFrom: "#1e1f22",
	backdropTo: "#2b2d31",
	row: "#111214",
	rowAlt: "#17181b",
	text: "#ffffff",
	muted: "#b5bac1",
	accent: "#5865f2",
} as const;

/** Gold, silver and bronze for the top three, then the plain rank number. */
const MEDALS = ["#fee75c", "#c9ccd1", "#cd7f32"] as const;

export interface BoardRow {
	rank: number;
	displayName: string;
	avatarUrl: string;
	/** The headline figure — `Level 12`, or a balance. */
	primary: string;
	/** The supporting figure, in smaller grey text. */
	secondary: string;
}

export function boardHeight(rows: number): number {
	return HEADER + Math.max(1, rows) * ROW_HEIGHT + PADDING;
}

/** Only the first three places get a colour; everyone else is grey. */
export function medalColour(index: number): string {
	return MEDALS[index] ?? PALETTE.muted;
}

export async function renderBoardImage(
	title: string,
	rows: BoardRow[],
	emptyMessage = "Nobody is on this board yet.",
): Promise<AttachmentBuilder> {
	const height = boardHeight(rows.length);
	const canvas = createCanvas(WIDTH, height);
	const draw = canvas.getContext("2d");

	const backdrop = draw.createLinearGradient(0, 0, WIDTH, height);
	backdrop.addColorStop(0, PALETTE.backdropFrom);
	backdrop.addColorStop(1, PALETTE.backdropTo);
	draw.fillStyle = backdrop;
	draw.fillRect(0, 0, WIDTH, height);

	draw.textBaseline = "middle";
	draw.textAlign = "left";
	draw.fillStyle = PALETTE.text;
	fitFont(draw, title, WIDTH - PADDING * 2 - 16, 40, "sans-serif");
	draw.fillText(title, PADDING + 8, HEADER / 2);

	if (rows.length === 0) {
		draw.fillStyle = PALETTE.muted;
		draw.font = "26px sans-serif";
		draw.fillText(emptyMessage, PADDING + 8, HEADER + ROW_HEIGHT / 2);
		return toAttachment(canvas, "leaderboard.png");
	}

	for (const [index, row] of rows.entries()) {
		const top = HEADER + index * ROW_HEIGHT;
		const rowHeight = ROW_HEIGHT - 10;
		const middle = top + rowHeight / 2;

		draw.fillStyle = index % 2 === 0 ? PALETTE.row : PALETTE.rowAlt;
		roundedRect(draw, PADDING, top, WIDTH - PADDING * 2, rowHeight, 14);
		draw.fill();

		draw.textAlign = "center";
		draw.fillStyle = medalColour(index);
		draw.font = "bold 28px sans-serif";
		draw.fillText(String(row.rank), PADDING + 40, middle);

		const avatarSize = rowHeight - 20;
		const avatarX = PADDING + 74;
		await drawAvatarOrInitial(draw, row.avatarUrl, avatarX, top + 10, avatarSize, row.displayName, PALETTE.accent);

		const nameX = avatarX + avatarSize + 20;
		draw.textAlign = "left";
		draw.fillStyle = PALETTE.text;
		fitFont(draw, row.displayName, WIDTH - nameX - 300, 28, "sans-serif");
		draw.fillText(row.displayName, nameX, middle);

		draw.textAlign = "right";
		draw.fillStyle = PALETTE.accent;
		draw.font = "bold 26px sans-serif";
		draw.fillText(row.primary, WIDTH - PADDING - 150, middle);

		draw.fillStyle = PALETTE.muted;
		draw.font = "22px sans-serif";
		draw.fillText(row.secondary, WIDTH - PADDING - 20, middle);
	}

	return toAttachment(canvas, "leaderboard.png");
}
