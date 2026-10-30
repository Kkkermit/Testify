import { isPlaylistUrl, resolveQuery, sourceOfHost } from "@lib/music/musicQuery.util";

describe("resolveQuery", () => {
	it.each([
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
		["https://youtu.be/dQw4w9WgXcQ?t=42", "youtube"],
		["https://www.youtube.com/shorts/abcdefghijk", "youtube"],
		["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
		["https://soundcloud.com/artist/track", "soundcloud"],
		["https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", "spotify"],
		["https://example.com/song.mp3", "other"],
	])("reads %s as a %s link", (raw, source) => {
		expect(resolveQuery(raw)).toEqual({ kind: "url", url: expect.any(String), source });
	});

	/** A prefix with nothing after it is a typo, not a search for everything. */
	it.each(["", "   ", "sc:", "yt:   "])("refuses %p", (raw) => {
		expect(resolveQuery(raw)).toBeNull();
	});

	/** Anything that is not http(s) is searched for as text, never handed to a downloader. */
	it.each(["file:///etc/passwd", "data:audio/mp3;base64,AAAA", "ftp://host/song.mp3"])(
		"does not treat %p as a link",
		(raw) => {
			expect(resolveQuery(raw)).toMatchObject({ kind: "search" });
		},
	);

	/** No music service is reached by an address literal or a bare name, and each of these is the host's own network. */
	it.each([
		"http://127.0.0.1:27017/",
		"http://localhost:3000/api/owner/stats",
		"http://[::1]/",
		"http://169.254.169.254/latest/meta-data/",
		"http://2130706433/",
		"http://0x7f.1/",
		"http://metadata.google.internal/",
		"http://router/",
		"http://printer.local/",
	])("searches for %p as text rather than fetching it", (raw) => {
		expect(resolveQuery(raw)).toMatchObject({ kind: "search" });
	});

	it("trims what a phone keyboard adds", () => {
		expect(resolveQuery("  https://youtu.be/abc  ")).toMatchObject({ kind: "url", source: "youtube" });
	});
});

describe("sourceOfHost", () => {
	/** A look-alike domain must not be read as the real one. */
	it.each(["notyoutube.com", "youtube.com.evil.test", "soundcloud.com.attacker.test"])(
		"does not mistake %s for a known service",
		(host) => {
			expect(sourceOfHost(host)).toBe("other");
		},
	);
});

describe("isPlaylistUrl", () => {
	it.each([
		"https://www.youtube.com/playlist?list=PLabc",
		"https://soundcloud.com/artist/sets/a-playlist",
		"https://open.spotify.com/album/abc",
		"https://open.spotify.com/playlist/abc",
	])("recognises %s as many tracks", (url) => {
		expect(isPlaylistUrl(url)).toBe(true);
	});

	/** A track opened from inside a playlist is still one track; queueing 200 would be a nasty surprise. */
	it("treats a watch link carrying a list parameter as a single track", () => {
		expect(isPlaylistUrl("https://www.youtube.com/watch?v=abc&list=PLabc")).toBe(false);
	});

	it.each(["https://youtu.be/abc", "https://soundcloud.com/artist/track", "not a url"])(
		"says %s is not a playlist",
		(url) => {
			expect(isPlaylistUrl(url)).toBe(false);
		},
	);
});
