import { RETRIES_AFTER } from "@lib/music/music.constants";
import { aboutTheTrack, classifyProblem } from "@lib/music/musicProblem.util";

describe("classifyProblem", () => {
	/** Verbatim from a real log: this is the line that has to turn into advice somebody can act on. */
	it("reads YouTube's 403 as a refusal and names the fix", () => {
		const problem = classifyProblem("ERROR: unable to download video data: HTTP Error 403: Forbidden");

		expect(problem?.kind).toBe("forbidden");
		expect(problem?.advice).toContain("npm run music:setup");
	});

	it("reads the bot check as its own thing, because updating yt-dlp does not fix it", () => {
		expect(classifyProblem("ERROR: [youtube] abc: Sign in to confirm you’re not a bot.")?.kind).toBe("bot-check");
	});
	/** Verbatim from production: YouTube's own reason, passed through, which surfaced as a crash with a stack. */
	it("reads YouTube asking for a reload as a refusal of the host's session", () => {
		const problem = classifyProblem("ERROR: [youtube] Vhvepsf5ynQ: The page needs to be reloaded.");

		expect(problem?.kind).toBe("session");
		expect(aboutTheTrack(problem)).toBe(false);
	});

	it.each(["Video unavailable", "Private video", "This video has been removed by the uploader"])(
		"reads %s as a video nobody can have",
		(message) => {
			expect(classifyProblem(`ERROR: [youtube] abc: ${message}`)?.kind).toBe("unavailable");
		},
	);

	/** Verbatim from production: a SoundCloud upload only offered encrypted, which nothing here will ever decrypt. */
	it("reads a DRM-protected track as one that can never play, not as a crash", () => {
		const problem = classifyProblem("ERROR: [soundcloud] 2398987035: This video is DRM protected");

		expect(problem?.kind).toBe("drm");
		expect(aboutTheTrack(problem)).toBe(true);
		expect(aboutTheTrack(classifyProblem("HTTP Error 403: Forbidden"))).toBe(false);
	});

	/** Anything unrecognised keeps the ordinary retries rather than being given up on early. */
	it("says nothing about a failure it does not recognise", () => {
		expect(classifyProblem("yt-dlp exited 1")).toBeNull();
	});
});

describe("RETRIES_AFTER", () => {
	/** A 403 is sometimes an address that expired between asking and downloading, so it earns exactly one. */
	it("gives a 403 one more go and the others none", () => {
		expect(RETRIES_AFTER).toEqual({ forbidden: 1, "bot-check": 0, session: 0, unavailable: 0, drm: 0 });
	});
});
