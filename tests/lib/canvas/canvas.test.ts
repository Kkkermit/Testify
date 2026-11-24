import { createCanvas } from "@napi-rs/canvas";
import { fetchPicture, loadAvatar, MAX_PICTURE_SIDE, safeToDecode } from "@lib/canvas/canvas.util";

const PICTURE = createCanvas(4, 4).toBuffer("image/png");

/** A PNG's first 33 bytes claim its size, and that is all a decoder reads before it allocates the whole bitmap. */
function pngClaiming(side: number): Buffer {
	const header = Buffer.alloc(33);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
	header.writeUInt32BE(13, 8);
	header.write("IHDR", 12, "ascii");
	header.writeUInt32BE(side, 16);
	header.writeUInt32BE(side, 20);
	header.writeUInt8(8, 24);
	header.writeUInt8(6, 25);
	return header;
}

describe("fetchPicture", () => {
	let fetched: jest.SpiedFunction<typeof fetch>;

	beforeEach(() => {
		fetched = jest.spyOn(globalThis, "fetch");
	});

	/** An artwork address is whatever the site yt-dlp read says it is, so it may point into the host's own network. */
	it("fetches nothing that is not https", async () => {
		expect(await fetchPicture("http://169.254.169.254/latest/meta-data/")).toBeNull();
		expect(await fetchPicture("file:///etc/passwd")).toBeNull();
		expect(fetched).not.toHaveBeenCalled();
	});

	/** A redirect could lead anywhere, and a body has to be held whole before it can be drawn. */
	it("refuses a redirect, and a body larger than any picture", async () => {
		fetched.mockResolvedValueOnce(new Response("x", { headers: { "content-length": String(64 * 1024 * 1024) } }));
		fetched.mockResolvedValueOnce(new Response(new Uint8Array(8 * 1024 * 1024 + 1)));

		expect(await fetchPicture("https://cdn.example/a.png")).toBeNull();
		expect(await fetchPicture("https://cdn.example/b.png")).toBeNull();
		expect(fetched).toHaveBeenCalledWith("https://cdn.example/a.png", expect.objectContaining({ redirect: "error" }));
	});

	it("hands back an ordinary picture's bytes", async () => {
		fetched.mockResolvedValueOnce(new Response(PICTURE));

		expect(await fetchPicture("https://cdn.example/a.png")).toEqual(PICTURE);
	});

	/** With no length declared the whole body was read before its size was checked, for as long as the server sent. */
	it("stops reading a body that declares no length once it passes any picture's size", async () => {
		let sent = 0;
		const endless = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent += 1024 * 1024;
				controller.enqueue(new Uint8Array(1024 * 1024));
			},
		});
		fetched.mockResolvedValueOnce(new Response(endless));

		expect(await fetchPicture("https://cdn.example/endless.png")).toBeNull();
		expect(sent).toBeLessThan(16 * 1024 * 1024);
	});

	/** A track's artwork is whatever the page yt-dlp read says, and decoding a picture claiming 50,000 pixels a side ran the bot out of memory. */
	it("refuses a picture claiming more pixels than can be decoded safely", async () => {
		fetched.mockResolvedValueOnce(new Response(pngClaiming(50_000)));

		expect(await fetchPicture("https://cdn.example/bomb.png")).toBeNull();
	});

	/** A card draws an initial in place of an avatar the CDN would not give, rather than failing the command. */
	it("leaves a card's avatar empty, never throwing, when the CDN fails or sends no picture", async () => {
		fetched.mockRejectedValueOnce(new Error("ECONNRESET"));
		fetched.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));

		await expect(loadAvatar("https://cdn.example/a.png")).resolves.toBeNull();
		await expect(loadAvatar("https://cdn.example/b.png")).resolves.toBeNull();
	});
});

describe("safeToDecode", () => {
	it("decodes only a raster picture no larger than any card needs, judged on its header", () => {
		const cases = [
			["a small PNG", PICTURE, true],
			["a PNG at the largest side", pngClaiming(MAX_PICTURE_SIDE), true],
			["a PNG one pixel past it", pngClaiming(MAX_PICTURE_SIDE + 1), false],
			["a PNG claiming 50,000 pixels a side", pngClaiming(50_000), false],
			["an SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'), false],
			["no picture at all", Buffer.from("not an image"), false],
		] as const;

		const wrong = cases.filter(([, bytes, safe]) => safeToDecode(bytes) !== safe).map(([name]) => name);
		expect(wrong).toEqual([]);
	});
});
