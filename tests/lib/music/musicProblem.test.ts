import { classifyProblem, RETRIES_AFTER } from "@lib/music/musicProblem.util";

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

	it.each(["Video unavailable", "Private video", "This video has been removed by the uploader"])(
		"reads %s as a video nobody can have",
		(message) => {
			expect(classifyProblem(`ERROR: [youtube] abc: ${message}`)?.kind).toBe("unavailable");
		},
	);

	/** Anything unrecognised keeps the ordinary retries rather than being given up on early. */
	it("says nothing about a failure it does not recognise", () => {
		expect(classifyProblem("yt-dlp exited 1")).toBeNull();
	});
});

describe("RETRIES_AFTER", () => {
	/** A 403 is sometimes an address that expired between asking and downloading, so it earns exactly one. */
	it("gives a 403 one more go and the others none", () => {
		expect(RETRIES_AFTER).toEqual({ forbidden: 1, "bot-check": 0, unavailable: 0 });
	});
});
