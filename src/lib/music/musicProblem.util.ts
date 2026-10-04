import { type ProblemKind, type DownloadProblem } from "@lib/music/music.types";
/** What a dying downloader said, sorted into the few answers that change what the player should do next. */

const PATTERNS: { kind: ProblemKind; pattern: RegExp; advice: string }[] = [
	{
		kind: "bot-check",
		pattern: /sign in to confirm|not a bot/i,
		advice: "YouTube asked this host to prove it is not a bot, so it would not hand over the audio.",
	},
	{
		// YouTube's own wording, passed through by yt-dlp, when it stops trusting the session a request came with.
		kind: "session",
		pattern: /page needs to be reloaded/i,
		advice: "YouTube would not hand over the audio just now — it stopped trusting this host's session.",
	},
	{
		kind: "drm",
		pattern: /DRM protected/i,
		advice: "That track is DRM-protected, so no bot can play it. Try another upload of the same song.",
	},
	{
		kind: "unavailable",
		pattern: /video unavailable|private video|removed by the uploader|not available in your country|members-only/i,
		advice: "That video is unavailable — private, removed, or blocked where the bot is hosted.",
	},
	{
		kind: "forbidden",
		pattern: /HTTP Error 403|403: Forbidden/i,
		advice:
			"YouTube refused the download. An out-of-date yt-dlp is the usual cause — run `npm run music:setup` on the host.",
	},
];

/** The service answered about this one track, which is neither a fault on its side nor worth trying elsewhere. */
export function aboutTheTrack(problem: DownloadProblem | null): boolean {
	return problem?.kind === "unavailable" || problem?.kind === "drm";
}

export function classifyProblem(message: string): DownloadProblem | null {
	const match = PATTERNS.find(({ pattern }) => pattern.test(message));

	return match === undefined ? null : { kind: match.kind, advice: match.advice };
}
