import { type Image, loadImage } from "@napi-rs/canvas";
import { createCanvas, roundedRect, type SKRSContext2D } from "@lib/canvas/canvas.util";
import { coverRect } from "@lib/canvas/welcomeCard.util";
import { formatClock } from "@lib/format/format.util";
import { type MusicSource, type Track } from "@lib/music/music.types";

/** The now-playing card: the track's artwork, blurred behind itself, with its title and artist beside it. */

const WIDTH = 1000;
const HEIGHT = 300;
const ART = 236;
const PAD = 32;
const TEXT_X = PAD + ART + 36;
const TEXT_WIDTH = WIDTH - TEXT_X - PAD;
const TITLE_Y = PAD + 92;
const TITLE_LEADING = 52;
const PALETTE = {
	from: "#2b2d6e",
	to: "#16161d",
	accent: "#5865f2",
	text: "#ffffff",
	muted: "#d0d3db",
	faint: "#a6a9b3",
	shade: "rgba(8, 8, 14, 0.6)",
	shadeDeep: "rgba(8, 8, 14, 0.85)",
	shadow: "rgba(0, 0, 0, 0.55)",
} as const;
const FONT = "sans-serif";

/** Long enough for a slow CDN, short enough that a panel is never held up waiting for a picture. */
const ARTWORK_TIMEOUT_MS = 4_000;

export const MUSIC_CARD_NAME = "now-playing.jpg";

const SOURCE_NAMES: Record<MusicSource, string> = {
	youtube: "YouTube",
	soundcloud: "SoundCloud",
	spotify: "Spotify",
	other: "the web",
};

export interface MusicCardText {
	eyebrow: string;
	title: string;
	author: string;
	length: string;
}

export function musicCardText(track: Track): MusicCardText {
	const source = SOURCE_NAMES[track.source];
	const author = track.author?.trim() ?? "";

	return {
		eyebrow: `NOW PLAYING · ${source.toUpperCase()}`,
		title: track.title.trim() === "" ? "Untitled" : track.title.trim(),
		author: author === "" ? `From ${source}` : author,
		length: track.durationMs === null ? "LIVE" : formatClock(track.durationMs),
	};
}

/** Wraps to at most `maxLines`, ending the last with an ellipsis rather than running off the card. */
export function clampLines(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines: number): string[] {
	const words = text.split(/\s+/).filter((word) => word !== "");
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		const candidate = current === "" ? word : `${current} ${word}`;
		if (ctx.measureText(candidate).width <= maxWidth || current === "") {
			current = candidate;
			continue;
		}

		lines.push(current);
		current = word;
		if (lines.length === maxLines) break;
	}

	if (lines.length < maxLines && current !== "") lines.push(current);

	const clipped = lines.length === maxLines && lines.join(" ").length < words.join(" ").length;
	const last = lines.length - 1;
	if (last >= 0 && (clipped || ctx.measureText(lines[last]!).width > maxWidth)) {
		lines[last] = ellipsise(ctx, lines[last]!, maxWidth);
	}

	return lines;
}

function ellipsise(ctx: SKRSContext2D, text: string, maxWidth: number): string {
	let cut = text;
	while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);

	return `${cut.trimEnd()}…`;
}

/** The artwork's bytes, or null; a picture is never worth failing the panel over. */
export async function fetchArtwork(url: string | null): Promise<Buffer | null> {
	if (url === null) return null;

	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(ARTWORK_TIMEOUT_MS) });
		if (!response.ok) return null;

		return Buffer.from(await response.arrayBuffer());
	} catch {
		return null;
	}
}

async function decode(bytes: Buffer | null): Promise<Image | null> {
	if (bytes === null) return null;

	try {
		return await loadImage(bytes);
	} catch {
		return null;
	}
}

function paintBackdrop(ctx: SKRSContext2D, art: Image | null): void {
	if (art === null) {
		const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
		gradient.addColorStop(0, PALETTE.from);
		gradient.addColorStop(1, PALETTE.to);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
		return;
	}

	// Drawn larger than the card, so the blur's soft edge falls outside it.
	const rect = coverRect(art, { width: WIDTH + 120, height: HEIGHT + 120 });
	ctx.filter = "blur(36px)";
	ctx.drawImage(art, rect.x - 60, rect.y - 60, rect.width, rect.height);
	ctx.filter = "none";

	const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
	shade.addColorStop(0, PALETTE.shade);
	shade.addColorStop(1, PALETTE.shadeDeep);
	ctx.fillStyle = shade;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function paintArtwork(ctx: SKRSContext2D, art: Image | null): void {
	ctx.save();
	ctx.shadowColor = PALETTE.shadow;
	ctx.shadowBlur = 32;
	ctx.shadowOffsetY = 10;
	roundedRect(ctx, PAD, PAD, ART, ART, 20);
	ctx.fillStyle = PALETTE.to;
	ctx.fill();
	ctx.restore();

	ctx.save();
	roundedRect(ctx, PAD, PAD, ART, ART, 20);
	ctx.clip();

	if (art === null) {
		const gradient = ctx.createLinearGradient(PAD, PAD, PAD + ART, PAD + ART);
		gradient.addColorStop(0, PALETTE.accent);
		gradient.addColorStop(1, PALETTE.from);
		ctx.fillStyle = gradient;
		ctx.fillRect(PAD, PAD, ART, ART);

		ctx.fillStyle = PALETTE.text;
		ctx.font = `bold 120px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("♪", PAD + ART / 2, PAD + ART / 2 + 6);
	} else {
		// A video thumbnail is 16:9, so the square is taken from its middle rather than squashed into it.
		const rect = coverRect(art, { width: ART, height: ART });
		ctx.drawImage(art, PAD + rect.x, PAD + rect.y, rect.width, rect.height);
	}

	ctx.restore();
}

function paintText(ctx: SKRSContext2D, copy: MusicCardText): void {
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";

	ctx.fillStyle = PALETTE.faint;
	ctx.font = `bold 19px ${FONT}`;
	ctx.fillText(copy.eyebrow, TEXT_X, PAD + 34);

	ctx.fillStyle = PALETTE.text;
	ctx.font = `bold 44px ${FONT}`;
	const titleLines = clampLines(ctx, copy.title, TEXT_WIDTH, 2);
	titleLines.forEach((line, index) => ctx.fillText(line, TEXT_X, TITLE_Y + index * TITLE_LEADING));

	ctx.fillStyle = PALETTE.muted;
	ctx.font = `28px ${FONT}`;
	const author = clampLines(ctx, copy.author, TEXT_WIDTH, 1)[0] ?? "";
	ctx.fillText(author, TEXT_X, TITLE_Y + (Math.max(titleLines.length, 1) - 1) * TITLE_LEADING + 40);

	// The length sits on the artwork's baseline, where a progress bar would be on a player.
	ctx.font = `bold 22px ${FONT}`;
	const pill = ctx.measureText(copy.length).width + 36;
	const pillY = PAD + ART - 40;
	roundedRect(ctx, TEXT_X, pillY, pill, 40, 20);
	ctx.fillStyle = PALETTE.accent;
	ctx.fill();
	ctx.fillStyle = PALETTE.text;
	ctx.textBaseline = "middle";
	ctx.fillText(copy.length, TEXT_X + 18, pillY + 21);
}

/** A JPEG, because the blurred artwork behind the text is a photograph and a PNG of it runs to megabytes. */
export async function renderMusicCard(track: Track, artwork: Buffer | null): Promise<Buffer> {
	const canvas = createCanvas(WIDTH, HEIGHT);
	const ctx = canvas.getContext("2d");
	const art = await decode(artwork);

	paintBackdrop(ctx, art);
	paintArtwork(ctx, art);
	paintText(ctx, musicCardText(track));

	return canvas.toBuffer("image/jpeg", 88);
}
