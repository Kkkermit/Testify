import { fetchPicture } from "@lib/canvas/canvas.util";

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
		fetched.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));

		expect(await fetchPicture("https://cdn.example/a.png")).toEqual(Buffer.from([1, 2, 3]));
	});
});
