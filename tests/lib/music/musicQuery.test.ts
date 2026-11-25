import { isPlaylistUrl, resolveQuery, sourceOfHost } from "@lib/music/musicQuery.util";

describe("resolveQuery", () => {
	it("reads a link as the service it is on", () => {
		const links: [string, string][] = [
			["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
			["https://youtu.be/dQw4w9WgXcQ?t=42", "youtube"],
			["https://www.youtube.com/shorts/abcdefghijk", "youtube"],
			["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
			["https://www.youtube.com./watch?v=dQw4w9WgXcQ", "youtube"],
			["https://soundcloud.com/artist/track", "soundcloud"],
			["https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", "spotify"],
			["https://example.com/song.mp3", "other"],
		];

		const misread = links.filter(([raw, source]) => {
			const query = resolveQuery(raw);
			return query?.kind !== "url" || query.source !== source;
		});
		expect(misread).toEqual([]);
	});

	/** A prefix with nothing after it is a typo, not a search for everything. */
	it("refuses an empty argument or a prefix with nothing after it", () => {
		expect(["", "   ", "sc:", "yt:   "].filter((raw) => resolveQuery(raw) !== null)).toEqual([]);
	});

	/** Anything that is not http(s) is searched for as text, never handed to a downloader. */
	it("does not treat another scheme as a link", () => {
		const schemes = ["file:///etc/passwd", "data:audio/mp3;base64,AAAA", "ftp://host/song.mp3"];

		expect(schemes.filter((raw) => resolveQuery(raw)?.kind !== "search")).toEqual([]);
	});

	/** No music service is reached by an address literal or a bare name, and each of these is the host's own network. */
	it("searches for an address on the host's own network as text rather than fetching it", () => {
		const local = [
			"http://127.0.0.1:27017/",
			"http://localhost:3000/api/owner/stats",
			"http://[::1]/",
			"http://169.254.169.254/latest/meta-data/",
			"http://2130706433/",
			"http://0x7f.1/",
			"http://metadata.google.internal/",
			"http://router/",
			"http://printer.local/",
			// The root's dot on the end is the same name to a resolver, and slipped past the check once.
			"http://localhost./",
			"http://metadata.google.internal./latest/",
		];

		expect(local.filter((raw) => resolveQuery(raw)?.kind !== "search")).toEqual([]);
	});

	it("trims what a phone keyboard adds", () => {
		expect(resolveQuery("  https://youtu.be/abc  ")).toMatchObject({ kind: "url", source: "youtube" });
	});
});

describe("sourceOfHost", () => {
	/** A look-alike domain must not be read as the real one. */
	it("does not mistake a look-alike for a known service", () => {
		const lookAlikes = ["notyoutube.com", "youtube.com.evil.test", "soundcloud.com.attacker.test"];

		expect(lookAlikes.filter((host) => sourceOfHost(host) !== "other")).toEqual([]);
	});
});

describe("isPlaylistUrl", () => {
	it("recognises a playlist, a set and an album as many tracks", () => {
		const lists = [
			"https://www.youtube.com/playlist?list=PLabc",
			"https://soundcloud.com/artist/sets/a-playlist",
			"https://open.spotify.com/album/abc",
			"https://open.spotify.com/playlist/abc",
		];

		expect(lists.filter((url) => !isPlaylistUrl(url))).toEqual([]);
	});

	/** A track opened from inside a playlist is still one track; queueing 200 would be a nasty surprise. */
	it("treats a watch link carrying a list parameter as a single track", () => {
		expect(isPlaylistUrl("https://www.youtube.com/watch?v=abc&list=PLabc")).toBe(false);
	});

	it("says a single track, or something that is not a link, is not a playlist", () => {
		const singles = ["https://youtu.be/abc", "https://soundcloud.com/artist/track", "not a url"];

		expect(singles.filter((url) => isPlaylistUrl(url))).toEqual([]);
	});
});
