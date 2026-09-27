import { createCanvas } from "@napi-rs/canvas";
import { clampLines, fetchArtwork, musicCardText, renderMusicCard } from "@lib/canvas/musicCard.util";
import { type Track } from "@lib/music/music.types";

function track(overrides: Partial<Track> = {}): Track {
	return {
		url: "https://youtu.be/a",
		title: "Deli Girl",
		author: "Sun Casino",
		durationMs: 143_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
		...overrides,
	};
}

const JPEG = [0xff, 0xd8, 0xff];

describe("musicCardText", () => {
	it("names the source and the length", () => {
		expect(musicCardText(track())).toEqual({
			eyebrow: "NOW PLAYING · YOUTUBE",
			title: "Deli Girl",
			author: "Sun Casino",
			length: "2:23",
		});
	});

	it("says LIVE for a stream with no end, and names the source when there is no artist", () => {
		const copy = musicCardText(track({ durationMs: null, author: null, source: "soundcloud" }));

		expect(copy.length).toBe("LIVE");
		expect(copy.author).toBe("From SoundCloud");
	});

	it("never draws an empty title", () => {
		expect(musicCardText(track({ title: "   " })).title).toBe("Untitled");
	});
});

describe("clampLines", () => {
	const ctx = createCanvas(10, 10).getContext("2d");
	ctx.font = "20px sans-serif";

	it("keeps a short title on one line", () => {
		expect(clampLines(ctx, "Deli Girl", 400, 2)).toEqual(["Deli Girl"]);
	});

	/** A music-video title runs to a paragraph; the card holds two lines and says the rest was cut. */
	it("stops at the line limit and ends with an ellipsis", () => {
		const lines = clampLines(ctx, "word ".repeat(60).trim(), 200, 2);

		expect(lines).toHaveLength(2);
		expect(lines[1]?.endsWith("…")).toBe(true);
	});

	it("cuts a single word too long for the line rather than overflowing", () => {
		const [line] = clampLines(ctx, "a".repeat(200), 120, 1);

		expect(line?.endsWith("…")).toBe(true);
		expect(ctx.measureText(line ?? "").width).toBeLessThanOrEqual(120);
	});
});

describe("renderMusicCard", () => {
	it("draws a JPEG with no artwork at all", async () => {
		const card = await renderMusicCard(track(), null);

		expect([...card.subarray(0, 3)]).toEqual(JPEG);
		expect(card.length).toBeGreaterThan(5_000);
	});

	it("draws the artwork it is given", async () => {
		const art = createCanvas(160, 90);
		art.getContext("2d").fillRect(0, 0, 160, 90);

		await expect(renderMusicCard(track(), art.toBuffer("image/png"))).resolves.toBeInstanceOf(Buffer);
	});

	/** A thumbnail CDN can answer with an error page; the card still draws, with the placeholder art. */
	it("survives artwork that is not an image", async () => {
		const card = await renderMusicCard(track(), Buffer.from("<html>not found</html>"));

		expect([...card.subarray(0, 3)]).toEqual(JPEG);
	});
});

describe("fetchArtwork", () => {
	const realFetch = global.fetch;

	afterEach(() => {
		global.fetch = realFetch;
	});

	it("asks for nothing when there is no artwork", async () => {
		global.fetch = jest.fn();

		await expect(fetchArtwork(null)).resolves.toBeNull();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("answers null rather than throwing when the CDN fails", async () => {
		global.fetch = jest.fn(() => Promise.reject(new Error("ECONNRESET")));

		await expect(fetchArtwork("https://i.ytimg.com/vi/a/hq.jpg")).resolves.toBeNull();
	});

	it("answers null for an error status", async () => {
		global.fetch = jest.fn(() => Promise.resolve(new Response("gone", { status: 404 })));

		await expect(fetchArtwork("https://i.ytimg.com/vi/a/hq.jpg")).resolves.toBeNull();
	});
});
