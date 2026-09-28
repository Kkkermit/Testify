import { type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { type AttachmentBuilder } from "discord.js";
import { type BoardCard, type BoardRow, type BoardTheme } from "@lib/canvas/canvas.types";
import { createCanvas, drawAvatarImage, loadAvatar, roundedRect, toAttachment } from "@lib/canvas/canvas.util";
import { DISPLAY, drawText, measureText } from "@lib/canvas/text.util";

/** A leaderboard, drawn rather than listed: the top ten, and the reader's own row under them when they are further down. */

const WIDTH = 1000;
const PADDING = 36;
const HEADER = 172;
const ROW = 72;
const GAP = 12;
const VIEWER_LABEL = 44;
const FOOTER = 60;
const RADIUS = 28;

const INK = {
	backdropTop: "#0c0e17",
	backdropBottom: "#161a2c",
	row: "rgba(255, 255, 255, 0.045)",
	rowEdge: "rgba(255, 255, 255, 0.06)",
	text: "#f8fafc",
	muted: "#94a3b8",
	faint: "#64748b",
	onMedal: "#1c1305",
} as const;

const THEMES: Record<BoardTheme, { accent: string; deep: string; glow: string }> = {
	money: { accent: "#fbbf24", deep: "#b45309", glow: "rgba(245, 158, 11, 0.30)" },
	levels: { accent: "#a78bfa", deep: "#6d28d9", glow: "rgba(139, 92, 246, 0.32)" },
};

/** Gold, silver and bronze, each light at the top and deep at the bottom. */
const MEDALS = [
	["#fde68a", "#f59e0b"],
	["#f1f5f9", "#94a3b8"],
	["#fed7aa", "#c2410c"],
] as const;

/** Deep enough to carry a white letter, so a row without an avatar still reads as a person. */
const PLACEHOLDERS = ["#4f46e5", "#0f766e", "#b45309", "#be185d", "#1d4ed8", "#7c3aed", "#15803d", "#c2410c"] as const;

/** The same name always gets the same colour, so a person is recognisable from one board to the next. */
export function placeholderColour(name: string): string {
	let hash = 0;
	for (const point of name) hash = (hash * 31 + point.codePointAt(0)!) >>> 0;
	return PLACEHOLDERS[hash % PLACEHOLDERS.length]!;
}

export function medalColour(index: number): string | null {
	return MEDALS[index]?.[1] ?? null;
}

export interface BoardLayout {
	height: number;
	/** The top of each ranked row. */
	rows: number[];
	/** The top of the reader's own row, or of the note saying they are unranked; null when neither is drawn. */
	viewer: number | null;
	footer: number;
}

/** Where everything goes, as numbers, so the part that can be wrong is tested without drawing. */
export function boardLayout(card: Pick<BoardCard, "rows" | "viewer" | "unranked">): BoardLayout {
	const rows = card.rows.map((_, index) => HEADER + index * (ROW + GAP));
	let bottom = HEADER + Math.max(1, card.rows.length) * (ROW + GAP);

	let viewer: number | null = null;
	if (card.viewer !== null || card.unranked !== null) {
		viewer = bottom + VIEWER_LABEL - GAP;
		bottom = viewer + ROW + GAP;
	}

	return { height: bottom - GAP + FOOTER, rows, viewer, footer: bottom - GAP };
}

function backdrop(draw: SKRSContext2D, height: number, theme: BoardTheme): void {
	roundedRect(draw, 0, 0, WIDTH, height, RADIUS);
	draw.clip();

	const base = draw.createLinearGradient(0, 0, 0, height);
	base.addColorStop(0, INK.backdropTop);
	base.addColorStop(1, INK.backdropBottom);
	draw.fillStyle = base;
	draw.fillRect(0, 0, WIDTH, height);

	const glow = draw.createRadialGradient(PADDING + 60, 40, 0, PADDING + 60, 40, 520);
	glow.addColorStop(0, THEMES[theme].glow);
	glow.addColorStop(1, "rgba(0, 0, 0, 0)");
	draw.fillStyle = glow;
	draw.fillRect(0, 0, WIDTH, height);
}

// Drawn rather than typed, so no font on the host decides whether it appears.
function star(draw: SKRSContext2D, x: number, y: number, radius: number): void {
	draw.beginPath();
	for (let point = 0; point < 10; point += 1) {
		const reach = point % 2 === 0 ? radius : radius * 0.45;
		const angle = -Math.PI / 2 + (point * Math.PI) / 5;
		draw.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
	}
	draw.closePath();
	draw.fillStyle = INK.onMedal;
	draw.fill();
}

function header(draw: SKRSContext2D, card: BoardCard): void {
	const theme = THEMES[card.theme];
	const tile = 88;
	const top = 42;

	const fill = draw.createLinearGradient(PADDING, top, PADDING + tile, top + tile);
	fill.addColorStop(0, theme.accent);
	fill.addColorStop(1, theme.deep);
	draw.fillStyle = fill;
	roundedRect(draw, PADDING, top, tile, tile, 24);
	draw.fill();
	if (card.theme === "money") {
		drawText(draw, "$", PADDING + tile / 2, top + tile / 2 + 2, {
			size: 48,
			weight: 700,
			family: DISPLAY,
			colour: INK.onMedal,
			align: "center",
		});
	} else {
		star(draw, PADDING + tile / 2, top + tile / 2 + 2, 26);
	}

	const left = PADDING + tile + 26;
	const room = WIDTH - left - PADDING - 140;
	drawText(draw, card.title, left, top + 30, {
		size: 42,
		weight: 700,
		family: DISPLAY,
		colour: INK.text,
		maxWidth: room,
		minSize: 30,
	});
	drawText(draw, card.subtitle, left, top + 70, { size: 21, colour: INK.muted, maxWidth: room });

	const label = "TOP 10";
	const pillWidth = measureText(draw, label, { size: 16, weight: 700, colour: theme.accent }) + 32;
	const pillX = WIDTH - PADDING - pillWidth;
	draw.strokeStyle = theme.accent;
	draw.lineWidth = 1.5;
	roundedRect(draw, pillX, top + 12, pillWidth, 34, 17);
	draw.stroke();
	drawText(draw, label, pillX + pillWidth / 2, top + 30, {
		size: 16,
		weight: 700,
		colour: theme.accent,
		align: "center",
	});
}

function rankBadge(draw: SKRSContext2D, rank: number, x: number, y: number): void {
	const medal = MEDALS[rank - 1];

	if (medal !== undefined) {
		const fill = draw.createLinearGradient(x, y - 22, x, y + 22);
		fill.addColorStop(0, medal[0]);
		fill.addColorStop(1, medal[1]);
		draw.fillStyle = fill;
		draw.beginPath();
		draw.arc(x, y, 22, 0, Math.PI * 2);
		draw.fill();
	}

	drawText(draw, String(rank), x, y + 1, {
		size: rank >= 1_000 ? 16 : 21,
		weight: 700,
		colour: medal === undefined ? INK.muted : INK.onMedal,
		align: "center",
		maxWidth: 52,
	});
}

function youPill(draw: SKRSContext2D, x: number, y: number, accent: string): void {
	const width = measureText(draw, "YOU", { size: 13, weight: 700, colour: accent }) + 20;
	draw.fillStyle = accent;
	roundedRect(draw, x, y - 12, width, 24, 12);
	draw.fill();
	drawText(draw, "YOU", x + width / 2, y + 1, { size: 13, weight: 700, colour: INK.onMedal, align: "center" });
}

function row(draw: SKRSContext2D, entry: BoardRow, top: number, avatar: Image | null, theme: BoardTheme): void {
	const accent = THEMES[theme].accent;
	const medal = MEDALS[entry.rank - 1];
	const middle = top + ROW / 2;
	const width = WIDTH - PADDING * 2;

	draw.fillStyle = INK.row;
	roundedRect(draw, PADDING, top, width, ROW, 18);
	draw.fill();

	if (medal !== undefined) {
		const sheen = draw.createLinearGradient(PADDING, 0, PADDING + width * 0.6, 0);
		sheen.addColorStop(0, `${medal[1]}33`);
		sheen.addColorStop(1, `${medal[1]}00`);
		draw.fillStyle = sheen;
		roundedRect(draw, PADDING, top, width, ROW, 18);
		draw.fill();
	}

	draw.lineWidth = entry.you === true ? 2 : 1;
	draw.strokeStyle = entry.you === true ? accent : medal === undefined ? INK.rowEdge : `${medal[1]}73`;
	roundedRect(draw, PADDING + 0.5, top + 0.5, width - 1, ROW - 1, 18);
	draw.stroke();

	rankBadge(draw, entry.rank, PADDING + 44, middle);

	const size = 50;
	const avatarX = PADDING + 84;
	drawAvatarImage(
		draw,
		avatar,
		avatarX,
		middle - size / 2,
		size,
		entry.displayName,
		placeholderColour(entry.displayName),
	);
	draw.lineWidth = 2.5;
	draw.strokeStyle = medal?.[1] ?? "rgba(255, 255, 255, 0.14)";
	draw.beginPath();
	draw.arc(avatarX + size / 2, middle, size / 2 + 1.5, 0, Math.PI * 2);
	draw.stroke();

	const nameX = avatarX + size + 20;
	const valueRoom = 230;
	const nameRoom = WIDTH - PADDING - nameX - valueRoom - (entry.you === true ? 70 : 0);
	const nameWidth = drawText(draw, entry.displayName, nameX, middle - 11, {
		size: 25,
		weight: 600,
		colour: INK.text,
		maxWidth: nameRoom,
		minSize: 19,
	});
	if (entry.you === true) youPill(draw, nameX + nameWidth + 12, middle - 11, accent);
	drawText(draw, entry.secondary, nameX, middle + 16, { size: 17, colour: INK.muted, maxWidth: nameRoom });

	drawText(draw, entry.primary, WIDTH - PADDING - 26, middle + 1, {
		size: 29,
		weight: 700,
		colour: accent,
		align: "right",
		maxWidth: valueRoom - 20,
		minSize: 20,
	});
}

function notice(draw: SKRSContext2D, text: string, top: number): void {
	draw.setLineDash([6, 6]);
	draw.lineWidth = 1.5;
	draw.strokeStyle = "rgba(255, 255, 255, 0.16)";
	roundedRect(draw, PADDING + 0.5, top + 0.5, WIDTH - PADDING * 2 - 1, ROW - 1, 18);
	draw.stroke();
	draw.setLineDash([]);
	drawText(draw, text, WIDTH / 2, top + ROW / 2, {
		size: 20,
		colour: INK.muted,
		align: "center",
		maxWidth: WIDTH - PADDING * 4,
	});
}

export async function renderBoardImage(card: BoardCard): Promise<AttachmentBuilder> {
	const layout = boardLayout(card);
	const canvas = createCanvas(WIDTH, layout.height);
	const draw = canvas.getContext("2d");

	// Every avatar at once; drawing waits for the slowest rather than for the sum of them.
	const people = card.viewer === null ? card.rows : [...card.rows, card.viewer];
	const avatars = await Promise.all(people.map((person) => loadAvatar(person.avatarUrl)));

	backdrop(draw, layout.height, card.theme);
	header(draw, card);

	if (card.rows.length === 0) notice(draw, card.empty, HEADER);
	for (const [index, entry] of card.rows.entries()) {
		row(draw, entry, layout.rows[index]!, avatars[index] ?? null, card.theme);
	}

	if (layout.viewer !== null) {
		drawText(draw, card.viewer === null ? "WHERE YOU STAND" : "YOUR RANK", PADDING + 6, layout.viewer - 20, {
			size: 14,
			weight: 700,
			colour: INK.faint,
		});
		if (card.viewer === null) notice(draw, card.unranked ?? "", layout.viewer);
		else row(draw, card.viewer, layout.viewer, avatars.at(-1) ?? null, card.theme);
	}

	drawText(draw, card.footer, PADDING + 6, layout.footer + FOOTER / 2, { size: 16, colour: INK.faint });

	return toAttachment(canvas, "leaderboard.png");
}
