import { type AttachmentBuilder } from "discord.js";
import { createCanvas, drawAvatarOrInitial, roundedRect, toAttachment } from "@lib/canvas/canvas.util";
import { DISPLAY, drawText } from "@lib/canvas/text.util";
import { formatNumber, ordinal } from "@lib/format/format.util";

/** The `/rank` card. */

const WIDTH = 934;
const HEIGHT = 282;
const PALETTE = {
	backdropFrom: "#1e1f22",
	backdropTo: "#2b2d31",
	panel: "#111214",
	track: "#3f4147",
	fill: "#5865f2",
	text: "#ffffff",
	muted: "#b5bac1",
	accent: "#fee75c",
} as const;

export interface RankCardData {
	displayName: string;
	avatarUrl: string;
	level: number;
	/** `null` when the member is not on the board yet. */
	rank: number | null;
	xp: number;
	progress: number;
	needed: number;
	/** Anything above 1 draws a boost badge. */
	multiplier?: number;
}

export interface RankCardText {
	name: string;
	level: string;
	rank: string;
	xp: string;
	badge: string | null;
}

export function rankCardText(data: RankCardData): RankCardText {
	return {
		name: data.displayName,
		level: `LEVEL ${formatNumber(data.level)}`,
		rank: data.rank === null ? "UNRANKED" : `RANK ${ordinal(data.rank)}`,
		xp: `${formatNumber(data.progress)} / ${formatNumber(data.needed)} XP`,
		badge: (data.multiplier ?? 1) > 1 ? `×${data.multiplier} XP` : null,
	};
}

/** How much of the track to fill. */
export function barFill(progress: number, needed: number, trackWidth: number): number {
	if (needed <= 0) return trackWidth;

	const fraction = Math.max(0, Math.min(1, progress / needed));
	return Math.round(trackWidth * fraction);
}

export async function renderRankCard(data: RankCardData): Promise<AttachmentBuilder> {
	const canvas = createCanvas(WIDTH, HEIGHT);
	const draw = canvas.getContext("2d");
	const copy = rankCardText(data);

	const backdrop = draw.createLinearGradient(0, 0, WIDTH, HEIGHT);
	backdrop.addColorStop(0, PALETTE.backdropFrom);
	backdrop.addColorStop(1, PALETTE.backdropTo);
	draw.fillStyle = backdrop;
	draw.fillRect(0, 0, WIDTH, HEIGHT);

	draw.fillStyle = PALETTE.panel;
	roundedRect(draw, 24, 24, WIDTH - 48, HEIGHT - 48, 24);
	draw.fill();

	const avatarSize = 160;
	const avatarX = 56;
	const avatarY = (HEIGHT - avatarSize) / 2;

	draw.beginPath();
	draw.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
	draw.fillStyle = PALETTE.fill;
	draw.fill();

	await drawAvatarOrInitial(draw, data.avatarUrl, avatarX, avatarY, avatarSize, data.displayName, PALETTE.fill);

	const textX = avatarX + avatarSize + 44;
	const trackX = textX;
	const trackWidth = WIDTH - textX - 56;

	drawText(draw, copy.name, textX, 104, {
		size: 44,
		weight: 700,
		family: DISPLAY,
		colour: PALETTE.text,
		maxWidth: trackWidth - 220,
		minSize: 26,
	});
	drawText(draw, copy.rank, WIDTH - 56, 76, { size: 26, colour: PALETTE.muted, align: "right" });
	drawText(draw, copy.level, WIDTH - 56, 112, {
		size: 30,
		weight: 700,
		family: DISPLAY,
		colour: PALETTE.fill,
		align: "right",
	});

	// The track first, so a zero-progress bar still shows where the level ends.
	const trackY = 168;
	const trackHeight = 34;

	draw.fillStyle = PALETTE.track;
	roundedRect(draw, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
	draw.fill();

	const filled = barFill(data.progress, data.needed, trackWidth);
	if (filled > 0) {
		draw.fillStyle = PALETTE.fill;
		roundedRect(draw, trackX, trackY, Math.max(filled, trackHeight), trackHeight, trackHeight / 2);
		draw.fill();
	}

	drawText(draw, copy.xp, trackX, trackY + trackHeight + 28, { size: 22, colour: PALETTE.muted });
	if (copy.badge !== null) {
		drawText(draw, copy.badge, WIDTH - 56, trackY + trackHeight + 28, {
			size: 22,
			weight: 700,
			colour: PALETTE.accent,
			align: "right",
		});
	}

	return toAttachment(canvas, "rank.png");
}
