import { MAX_TRACK_ATTEMPTS } from "@lib/music/music.constants";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	addTracks,
	currentTrack,
	decideOnIdle,
	endedEarly,
	finished,
	removeAt,
	shuffleUpcoming,
	totalDurationMs,
	upcomingPage,
} from "@lib/music/musicQueue.util";

function track(title: string, durationMs: number | null = 180_000): Track {
	return {
		url: `https://youtu.be/${title}`,
		title,
		author: "Someone",
		durationMs,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
	};
}

function queueOf(titles: string[], index = 0, loop: QueueState["loop"] = "off"): QueueState {
	return { tracks: titles.map((title) => track(title)), index, loop };
}

describe("addTracks", () => {
	/** A request after the last song ended used to queue behind it rather than play, because it still read as current. */
	it("starts the first new track when the player is idle, even after a finished queue", () => {
		const added = addTracks(finished(queueOf(["done"])), [track("new")], { next: false, idle: true });

		expect(added.start).toBe(1);
		expect(added.state.tracks[added.start ?? -1]?.title).toBe("new");
	});
});

describe("removeAt", () => {
	/** Dropping a played track shifts everything left, and the index has to come with it. */
	it("keeps the same track playing when something before it is removed", () => {
		const state = removeAt(queueOf(["a", "b", "c"], 2), 0);

		expect(currentTrack(state)?.title).toBe("c");
	});

	it.each([-1, 3, 99])("ignores position %p", (position) => {
		expect(removeAt(queueOf(["a", "b", "c"], 0), position).tracks).toHaveLength(3);
	});
});

describe("shuffleUpcoming", () => {
	/** A shuffle that can reorder history would replay a track somebody already heard. */
	it("never moves what has already played", () => {
		const state = shuffleUpcoming(queueOf(["a", "b", "c", "d"], 1), () => 0);

		expect(state.tracks.slice(0, 2).map((entry) => entry.title)).toEqual(["a", "b"]);
	});
});

describe("endedEarly", () => {
	/** A live stream has no length, so nothing about it can be judged short. */
	it.each([null, 0, -1])("takes a track of length %p at its word", (expected) => {
		expect(endedEarly(1_000, expected)).toBe(false);
	});
});

describe("decideOnIdle", () => {
	const base = { state: queueOf(["a", "b"], 0), expectedMs: 180_000, attempts: 0 };

	/** A track that came apart is retried rather than skipped. */
	it("retries a track that came apart rather than moving on", () => {
		expect(decideOnIdle({ ...base, playedMs: 30_000 })).toEqual({ action: "retry", attempt: 1 });
	});

	it("gives up on a track that keeps breaking, so the queue is never stuck on one song", () => {
		expect(decideOnIdle({ ...base, playedMs: 0, attempts: MAX_TRACK_ATTEMPTS })).toEqual({
			action: "play",
			index: 1,
		});
	});

	/** Skipping is deliberate, so a half-played track must not be read as a broken one and replayed. */
	it("does not retry when somebody pressed skip", () => {
		expect(decideOnIdle({ ...base, playedMs: 5_000, skipped: true })).toEqual({ action: "play", index: 1 });
	});

	/** A live stream ends when it ends; retrying it for ever would pin the queue to a finished broadcast. */
	it("moves on from a stream of unknown length", () => {
		expect(decideOnIdle({ ...base, expectedMs: null, playedMs: 10 })).toEqual({ action: "play", index: 1 });
	});
});

describe("upcomingPage", () => {
	const ten = queueOf(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 0);

	it.each([5, 99])("clamps page %p to the last one", (page) => {
		expect(upcomingPage(ten, page, 5).page).toBe(1);
	});
});

describe("totalDurationMs", () => {
	/** One live stream makes the total meaningless, and "∞" is more honest than a wrong number. */
	it("gives up when any track has no length", () => {
		expect(totalDurationMs([track("a", 1_000), track("b", null)])).toBeNull();
	});
});
