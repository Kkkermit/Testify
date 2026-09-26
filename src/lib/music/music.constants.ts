import { type ProblemKind, type QueueState } from "@lib/music/music.types";

/** The identifiers, limits and defaults more than one module in this domain reads. */

/** The track's own level, and the only one that plays without passing through FFmpeg. */
export const UNITY_VOLUME = 100;

/** Where a new player starts when the host can change the level. */
export const DEFAULT_VOLUME = 50;

export const MIN_VOLUME = 0;

/** Past this the filter clips rather than getting louder, so it is a ceiling rather than a preference. */
export const MAX_VOLUME = 200;

/** What one press of the panel's louder or quieter button moves. */
export const VOLUME_STEP = 10;

export const MUSIC_ID = "music";

/** Its own handler rather than one of the player's buttons, because anybody in the channel may add a song. */
export const MUSIC_ADD_ID = "musicadd";

/**
 * How many more tries a track gets after each refusal: a 403 can be an expired address, the rest are YouTube's
 * decision.
 */
export const RETRIES_AFTER: Record<ProblemKind, number> = {
	forbidden: 1,
	"bot-check": 0,
	unavailable: 0,
};

export const MUSIC_SOURCES = ["youtube", "soundcloud", "spotify", "other"] as const;

export const LOOP_MODES = ["off", "track", "queue"] as const;

export const EMPTY_QUEUE: QueueState = { tracks: [], index: -1, loop: "off" };

/** Past this many goes at one track, the queue moves on rather than stalling on it for ever. */
export const MAX_TRACK_ATTEMPTS = 3;

/** Discord refuses a choice whose name or value is longer than this. */
export const CHOICE_MAX = 100;

/** The one subcommand the gate can never close over, or a server that switched music off could not switch it on. */
export const MUSIC_SYSTEM_SUBCOMMAND = "system";

/** Enough for a search to be worth scrolling, few enough that a playlist does not flood a queue. */
export const SEARCH_RESULTS = 8;
