import { type Canvas, createCanvas, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { imageSize } from "image-size";
import { clusters, drawText } from "@lib/canvas/text.util";

export { createCanvas };
export type { Canvas, SKRSContext2D };

/** Larger than any picture a card draws, so a hostile address cannot hand the bot a body it has to hold. */
const MAX_PICTURE_BYTES = 8 * 1024 * 1024;

const PICTURE_TIMEOUT_MS = 5_000;

/** Larger than any avatar, artwork or card, and small enough that decoding one cannot run the process out of memory. */
export const MAX_PICTURE_SIDE = 4_096;

const DECODABLE = new Set(["png", "jpg", "webp", "gif"]);

/** Read from the header alone, because a few kilobytes of PNG can declare a picture that decodes to gigabytes. */
export function safeToDecode(bytes: Uint8Array): boolean {
	try {
		const { width, height, type } = imageSize(bytes);
		return (
			type !== undefined &&
			DECODABLE.has(type) &&
			width > 0 &&
			height > 0 &&
			width <= MAX_PICTURE_SIDE &&
			height <= MAX_PICTURE_SIDE
		);
	} catch {
		return false;
	}
}

/** Null as soon as the body passes `limit`, since a server that declares no length can send without end. */
async function readUpTo(response: Response, limit: number): Promise<Buffer | null> {
	const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = response.body?.getReader();
	if (reader === undefined) return null;

	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return Buffer.concat(chunks);

		size += value.byteLength;
		if (size > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
}

/** An https picture's bytes, or null; a redirect is refused, so an address cannot lead the bot somewhere else. */
export async function fetchPicture(url: string, timeoutMs = PICTURE_TIMEOUT_MS): Promise<Buffer | null> {
	if (!/^https:\/\//i.test(url)) return null;

	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
		if (!response.ok || Number(response.headers.get("content-length") ?? 0) > MAX_PICTURE_BYTES) return null;

		const bytes = await readUpTo(response, MAX_PICTURE_BYTES);
		return bytes !== null && safeToDecode(bytes) ? bytes : null;
	} catch {
		return null;
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

/** An avatar to draw later, or null when there is none or it cannot be fetched, so a card never fails on the CDN. */
export async function loadAvatar(url: string | null): Promise<Image | null> {
	if (url === null || url === "") return null;

	const bytes = await fetchPicture(url);
	return bytes === null ? null : loadImage(bytes).catch(() => null);
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
