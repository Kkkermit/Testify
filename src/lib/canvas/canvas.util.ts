import { type Canvas, createCanvas, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { ServiceError } from "@core/errors";
import { clusters, drawText } from "@lib/canvas/text.util";

/** Shared canvas helpers. */

export { createCanvas };
export type { Canvas, SKRSContext2D };

async function fetchImage(url: string): Promise<Image> {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await loadImage(Buffer.from(await response.arrayBuffer()));
	} catch (error) {
		throw new ServiceError("image", error);
	}
}

export function toAttachment(canvas: Canvas, name: string): AttachmentBuilder {
	return new AttachmentBuilder(canvas.toBuffer("image/png"), { name });
}

export function roundedRect(
	ctx: SKRSContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + width, y, x + width, y + height, r);
	ctx.arcTo(x + width, y + height, x, y + height, r);
	ctx.arcTo(x, y + height, x, y, r);
	ctx.arcTo(x, y, x + width, y, r);
	ctx.closePath();
}

function circleClip(ctx: SKRSContext2D, x: number, y: number, radius: number): void {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
}

export async function drawAvatar(ctx: SKRSContext2D, url: string, x: number, y: number, size: number): Promise<void> {
	const image = await fetchImage(url);
	circleClip(ctx, x + size / 2, y + size / 2, size / 2);
	ctx.drawImage(image, x, y, size, size);
	ctx.restore();
}

/** An avatar to draw later, or null when there is none or it cannot be fetched. */
export async function loadAvatar(url: string | null): Promise<Image | null> {
	if (url === null || url === "") return null;
	return fetchImage(url).catch(() => null);
}

/** A loaded avatar in a circle, or the first letter of the name on `background` when there is none. */
export function drawAvatarImage(
	ctx: SKRSContext2D,
	image: Image | null,
	x: number,
	y: number,
	size: number,
	initial: string,
	background = "#5865f2",
): void {
	if (image !== null) {
		circleClip(ctx, x + size / 2, y + size / 2, size / 2);
		ctx.drawImage(image, x, y, size, size);
		ctx.restore();
		return;
	}

	ctx.save();
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	ctx.fillStyle = background;
	ctx.fill();
	ctx.restore();

	const letter = clusters(initial.trim())[0]?.toUpperCase() ?? "?";
	drawText(ctx, letter, x + size / 2, y + size / 2, {
		size: Math.round(size * 0.45),
		weight: 700,
		colour: "#ffffff",
		align: "center",
	});
}

/** The avatar, or a lettered circle when it cannot be fetched. */
export async function drawAvatarOrInitial(
	ctx: SKRSContext2D,
	url: string,
	x: number,
	y: number,
	size: number,
	initial: string,
	background = "#5865f2",
): Promise<boolean> {
	const image = await loadAvatar(url);
	drawAvatarImage(ctx, image, x, y, size, initial, background);
	return image !== null;
}
