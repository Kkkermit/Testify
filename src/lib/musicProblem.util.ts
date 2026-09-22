/** What a dying downloader said, sorted into the few answers that change what the player should do next. */

export type ProblemKind = "forbidden" | "bot-check" | "unavailable";

export interface DownloadProblem {
	kind: ProblemKind;
	/** One sentence for the panel, written as advice rather than as an error. */
	advice: string;
}

/**
 * How many more goes a track gets after each kind of refusal.
 *
 * A 403 is sometimes a signed address that expired between asking and downloading, so it earns one fresh try;
 * the other two are YouTube's decision about the video or the host, and asking again only adds to the count
 * that got the host flagged in the first place.
 */
export const RETRIES_AFTER: Record<ProblemKind, number> = {
	forbidden: 1,
	"bot-check": 0,
	unavailable: 0,
};

const PATTERNS: { kind: ProblemKind; pattern: RegExp; advice: string }[] = [
	{
		kind: "bot-check",
		pattern: /sign in to confirm|not a bot/i,
		advice: "YouTube asked this host to prove it is not a bot, so it would not hand over the audio.",
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

export function classifyProblem(message: string): DownloadProblem | null {
	const match = PATTERNS.find(({ pattern }) => pattern.test(message));

	return match === undefined ? null : { kind: match.kind, advice: match.advice };
}
