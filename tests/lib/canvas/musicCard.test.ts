import { musicCardText, renderMusicCard } from "@lib/canvas/musicCard.util";
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
	it("never draws an empty title", () => {
		expect(musicCardText(track({ title: "   " })).title).toBe("Untitled");
	});
});

describe("renderMusicCard", () => {
	/** A thumbnail CDN can answer with an error page; the card still draws, with the placeholder art. */
	it("survives artwork that is not an image", async () => {
		const card = await renderMusicCard(track(), Buffer.from("<html>not found</html>"));

		expect([...card.subarray(0, 3)]).toEqual(JPEG);
	});
});
