import { loadImage } from "@napi-rs/canvas";
import { type AttachmentBuilder } from "discord.js";
import { createCanvas, drawAvatarOrInitial, fitFont, roundedRect, toAttachment } from "@lib/canvas.util";
import { formatNumber } from "@lib/format.util";

/** The join card: avatar, name, and which member they are. */

const WIDTH = 1024;
const HEIGHT = 400;
const PALETTE = {
	from: "#1e1f22",
	to: "#2b2d31",
	accent: "#5865f2",
	text: "#ffffff",
	muted: "#c9ccd1",
	scrim: "rgba(0, 0, 0, 0.55)",
} as const;

export interface WelcomeCardData {
	displayName: string;
	avatarUrl: string;
	serverName: string;
	/** Which member they are — 1 for the very first. */
	memberCount: number;
	/** The guild's own background. */
	background?: Buffer | null;
}

export interface WelcomeCardText {
	heading: string;
	name: string;
	position: string;
}

export function welcomeCardText(data: WelcomeCardData): WelcomeCardText {
	return {
		heading: `WELCOME TO ${data.serverName.toUpperCase()}`,
		name: data.displayName,
		position: `Member #${formatNumber(data.memberCount)}`,
	};
}

/**
 * Where to draw a background so it covers the card without distorting it — the same maths as CSS `object-fit:
 * cover`, cropping the overflowing axis.
 */
export function coverRect(
	source: { width: number; height: number },
	target: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
	if (source.width <= 0 || source.height <= 0) {
		return { x: 0, y: 0, ...target };
	}

	const scale = Math.max(target.width / source.width, target.height / source.height);
	const width = source.width * scale;
	const height = source.height * scale;

	return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height };
}

export async function renderWelcomeCard(data: WelcomeCardData): Promise<AttachmentBuilder> {
	const canvas = createCanvas(WIDTH, HEIGHT);
	const draw = canvas.getContext("2d");
	const copy = welcomeCardText(data);

	let painted = false;
	if (data.background) {
		try {
			const image = await loadImage(data.background);
			const rect = coverRect(image, { width: WIDTH, height: HEIGHT });
			draw.drawImage(image, rect.x, rect.y, rect.width, rect.height);

			// A scrim over whatever they uploaded, so white text stays readable on a
			// bright photo. Without it the card is unreadable half the time.
			draw.fillStyle = PALETTE.scrim;
			draw.fillRect(0, 0, WIDTH, HEIGHT);
			painted = true;
		} catch {
			painted = false;
		}
	}

	if (!painted) {
		const gradient = draw.createLinearGradient(0, 0, WIDTH, HEIGHT);
		gradient.addColorStop(0, PALETTE.from);
		gradient.addColorStop(1, PALETTE.to);
		draw.fillStyle = gradient;
		draw.fillRect(0, 0, WIDTH, HEIGHT);
	}

	draw.strokeStyle = PALETTE.accent;
	draw.lineWidth = 8;
	roundedRect(draw, 4, 4, WIDTH - 8, HEIGHT - 8, 28);
	draw.stroke();

	const avatarSize = 190;
	const avatarX = (WIDTH - avatarSize) / 2;
	const avatarY = 46;

	draw.beginPath();
	draw.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
	draw.fillStyle = PALETTE.accent;
	draw.fill();

	await drawAvatarOrInitial(draw, data.avatarUrl, avatarX, avatarY, avatarSize, data.displayName, PALETTE.accent);

	draw.textAlign = "center";
	draw.textBaseline = "middle";

	draw.fillStyle = PALETTE.muted;
	fitFont(draw, copy.heading, WIDTH - 120, 30, "sans-serif");
	draw.fillText(copy.heading, WIDTH / 2, avatarY + avatarSize + 42);

	draw.fillStyle = PALETTE.text;
	fitFont(draw, copy.name, WIDTH - 120, 52, "sans-serif");
	draw.fillText(copy.name, WIDTH / 2, avatarY + avatarSize + 92);

	draw.fillStyle = PALETTE.muted;
	draw.font = "26px sans-serif";
	draw.fillText(copy.position, WIDTH / 2, avatarY + avatarSize + 136);

	return toAttachment(canvas, "welcome.png");
}
