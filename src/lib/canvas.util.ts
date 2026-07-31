import { type Canvas, createCanvas, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { ServiceError } from "@core/errors";

/** Shared canvas helpers. */

export { createCanvas };
export type { Canvas, SKRSContext2D };

export async function fetchImage(url: string): Promise<Image> {
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

/** Wraps text to `maxWidth`, honouring the context's current font. */
export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
	const lines: string[] = [];
	let current = "";

	for (const word of text.split(/\s+/)) {
		const candidate = current.length === 0 ? word : `${current} ${word}`;
		if (ctx.measureText(candidate).width > maxWidth && current.length > 0) {
			lines.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}

	if (current.length > 0) lines.push(current);
	return lines;
}

/** Shrinks the font size until the text fits, then returns the size that was used. */
export function fitFont(ctx: SKRSContext2D, text: string, maxWidth: number, start: number, family: string): number {
	let size = start;
	do {
		ctx.font = `${size}px ${family}`;
		size -= 1;
	} while (ctx.measureText(text).width > maxWidth && size > 8);
	return size + 1;
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

export function circleClip(ctx: SKRSContext2D, x: number, y: number, radius: number): void {
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
	try {
		await drawAvatar(ctx, url, x, y, size);
		return true;
	} catch {
		ctx.save();
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.fillStyle = background;
		ctx.fill();

		ctx.fillStyle = "#ffffff";
		ctx.font = `${Math.round(size * 0.45)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText((initial.trim()[0] ?? "?").toUpperCase(), x + size / 2, y + size / 2);
		ctx.restore();

		return false;
	}
}
