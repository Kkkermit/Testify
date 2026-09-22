import {
	clearUpcoming,
	currentTrack,
	decideOnIdle,
	EARLY_TOLERANCE_MS,
	EMPTY_QUEUE,
	endedEarly,
	enqueue,
	enqueueNext,
	MAX_TRACK_ATTEMPTS,
	nextIndex,
	type QueueState,
	removeAt,
	shuffleUpcoming,
	totalDurationMs,
	type Track,
	upcomingPage,
	withLoop,
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

describe("enqueue", () => {
	it("adds to the end without moving what is playing", () => {
		const state = enqueue(queueOf(["a", "b"], 0), [track("c")]);

		expect(state.tracks.map((entry) => entry.title)).toEqual(["a", "b", "c"]);
		expect(currentTrack(state)?.title).toBe("a");
	});

	it("puts a play-next straight after the current track", () => {
		const state = enqueueNext(queueOf(["a", "b", "c"], 0), [track("jump")]);

		expect(state.tracks.map((entry) => entry.title)).toEqual(["a", "jump", "b", "c"]);
	});

	it("starts an empty queue rather than throwing", () => {
		expect(enqueue(EMPTY_QUEUE, [track("a")]).tracks).toHaveLength(1);
		expect(currentTrack(EMPTY_QUEUE)).toBeNull();
	});
});

describe("removeAt", () => {
	/** Dropping a played track shifts everything left, and the index has to come with it. */
	it("keeps the same track playing when something before it is removed", () => {
		const state = removeAt(queueOf(["a", "b", "c"], 2), 0);

		expect(currentTrack(state)?.title).toBe("c");
	});

	it("leaves the index alone when something after it is removed", () => {
		const state = removeAt(queueOf(["a", "b", "c"], 0), 2);

		expect(currentTrack(state)?.title).toBe("a");
		expect(state.tracks).toHaveLength(2);
	});

	it.each([-1, 3, 99])("ignores position %p", (position) => {
		expect(removeAt(queueOf(["a", "b", "c"], 0), position).tracks).toHaveLength(3);
	});
});

describe("clearUpcoming", () => {
	it("keeps the current track and drops the rest", () => {
		const state = clearUpcoming(queueOf(["a", "b", "c"], 1));

		expect(state.tracks.map((entry) => entry.title)).toEqual(["a", "b"]);
		expect(currentTrack(state)?.title).toBe("b");
	});
});

describe("shuffleUpcoming", () => {
	/** A shuffle that can reorder history would replay a track somebody already heard. */
	it("never moves what has already played", () => {
		const state = shuffleUpcoming(queueOf(["a", "b", "c", "d"], 1), () => 0);

		expect(state.tracks.slice(0, 2).map((entry) => entry.title)).toEqual(["a", "b"]);
	});

	it("keeps every track, so nothing is lost in the reorder", () => {
		const state = shuffleUpcoming(queueOf(["a", "b", "c", "d"], 0), () => 0.99);

		expect(state.tracks.map((entry) => entry.title).sort()).toEqual(["a", "b", "c", "d"]);
	});

	it("actually reorders when the roll says to", () => {
		const state = shuffleUpcoming(queueOf(["a", "b", "c", "d"], 0), () => 0);

		expect(state.tracks.map((entry) => entry.title)).not.toEqual(["a", "b", "c", "d"]);
	});
});

describe("nextIndex", () => {
	it("walks forward", () => {
		expect(nextIndex(queueOf(["a", "b"], 0))).toBe(1);
	});

	it("stops at the end when looping is off", () => {
		expect(nextIndex(queueOf(["a", "b"], 1))).toBeNull();
	});

	it("returns to the start when the queue loops", () => {
		expect(nextIndex(queueOf(["a", "b"], 1, "queue"))).toBe(0);
	});

	it("stays put when one track loops", () => {
		expect(nextIndex(queueOf(["a", "b"], 0, "track"))).toBe(0);
	});

	it("has nowhere to go when there is nothing queued", () => {
		expect(nextIndex(EMPTY_QUEUE)).toBeNull();
		expect(nextIndex(withLoop(EMPTY_QUEUE, "queue"))).toBeNull();
	});
});

describe("endedEarly", () => {
	it("calls a track that played its length finished", () => {
		expect(endedEarly(180_000, 180_000)).toBe(false);
	});

	it("allows for the tolerance at the end", () => {
		expect(endedEarly(180_000 - EARLY_TOLERANCE_MS + 1, 180_000)).toBe(false);
	});

	it("spots a track that stopped halfway", () => {
		expect(endedEarly(90_000, 180_000)).toBe(true);
	});

	/** A live stream has no length, so nothing about it can be judged short. */
	it.each([null, 0, -1])("takes a track of length %p at its word", (expected) => {
		expect(endedEarly(1_000, expected)).toBe(false);
	});
});

describe("decideOnIdle", () => {
	const base = { state: queueOf(["a", "b"], 0), expectedMs: 180_000, attempts: 0 };

	/**
	 * The bug this whole function exists for: a stalled stream and a finished track arrive as the same event,
	 * and advancing on both is what makes a queue skip three songs on a bad connection.
	 */
	it("retries a track that came apart rather than moving on", () => {
		expect(decideOnIdle({ ...base, playedMs: 30_000 })).toEqual({ action: "retry", attempt: 1 });
	});

	it("moves on once a track has played its length", () => {
		expect(decideOnIdle({ ...base, playedMs: 180_000 })).toEqual({ action: "play", index: 1 });
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

	it("stops when somebody pressed stop, whatever else is true", () => {
		expect(decideOnIdle({ ...base, playedMs: 5_000, stopping: true })).toEqual({
			action: "stop",
			reason: "requested",
		});
	});

	it("stops when a finished track was the last one", () => {
		expect(decideOnIdle({ ...base, state: queueOf(["a"], 0), playedMs: 180_000 })).toEqual({
			action: "stop",
			reason: "empty",
		});
	});

	it("replays the same track when one track is on loop", () => {
		expect(decideOnIdle({ ...base, state: queueOf(["a", "b"], 0, "track"), playedMs: 180_000 })).toEqual({
			action: "play",
			index: 0,
		});
	});

	/** A live stream ends when it ends; retrying it for ever would pin the queue to a finished broadcast. */
	it("moves on from a stream of unknown length", () => {
		expect(decideOnIdle({ ...base, expectedMs: null, playedMs: 10 })).toEqual({ action: "play", index: 1 });
	});
});

describe("upcomingPage", () => {
	const ten = queueOf(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 0);

	it("shows only what has not played", () => {
		expect(upcomingPage(ten, 0, 5).entries.map((entry) => entry.track.title)).toEqual(["b", "c", "d", "e", "f"]);
	});

	it("keeps the real position, so removing by number matches what is shown", () => {
		expect(upcomingPage(ten, 1, 5).entries[0]).toMatchObject({ position: 6 });
	});

	it.each([5, 99])("clamps page %p to the last one", (page) => {
		expect(upcomingPage(ten, page, 5).page).toBe(1);
	});

	it("clamps a negative page to the first", () => {
		expect(upcomingPage(ten, -3, 5).page).toBe(0);
	});

	it("reports one page when nothing is queued", () => {
		expect(upcomingPage(EMPTY_QUEUE, 0, 5)).toEqual({ entries: [], page: 0, pageCount: 1 });
	});
});

describe("totalDurationMs", () => {
	it("adds the queue up", () => {
		expect(totalDurationMs([track("a", 1_000), track("b", 2_000)])).toBe(3_000);
	});

	/** One live stream makes the total meaningless, and "∞" is more honest than a wrong number. */
	it("gives up when any track has no length", () => {
		expect(totalDurationMs([track("a", 1_000), track("b", null)])).toBeNull();
	});

	it("is zero for an empty queue", () => {
		expect(totalDurationMs([])).toBe(0);
	});
});

describe("decideOnIdle with fewer attempts allowed", () => {
	const two: QueueState = {
		tracks: [
			{ url: "a", title: "a", author: null, durationMs: 180_000, thumbnail: null, source: "youtube", requestedBy: "u" },
			{ url: "b", title: "b", author: null, durationMs: 180_000, thumbnail: null, source: "youtube", requestedBy: "u" },
		],
		index: 0,
		loop: "off",
	};

	it("moves on at once when no retry is allowed", () => {
		expect(decideOnIdle({ state: two, playedMs: 0, expectedMs: 180_000, attempts: 0, attemptsAllowed: 0 })).toEqual({
			action: "play",
			index: 1,
		});
	});

	it("still retries up to the number allowed", () => {
		expect(decideOnIdle({ state: two, playedMs: 0, expectedMs: 180_000, attempts: 0, attemptsAllowed: 1 })).toEqual({
			action: "retry",
			attempt: 1,
		});
	});
});
