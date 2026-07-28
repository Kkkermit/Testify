import { type Queue } from "distube";
import { panelStateOf, queueEntriesOf } from "@lib/musicQueue.util";

/**
 * A DisTube queue is far too large to build for real, and only a handful of its
 * fields reach the panel — so the mapping is tested against the shape it reads.
 */
function fakeQueue(overrides: Partial<Queue> = {}): Queue {
	return {
		songs: [song("Never Gonna Give You Up")],
		currentTime: 90,
		volume: 60,
		repeatMode: 0,
		paused: false,
		...overrides,
	} as unknown as Queue;
}

function song(name: string, extra: Record<string, unknown> = {}): unknown {
	return {
		name,
		url: `https://example.test/${name}`,
		duration: 213,
		uploader: { name: "Rick Astley" },
		user: { username: "alice" },
		thumbnail: "https://cdn.test/art.png",
		...extra,
	};
}

describe("panelStateOf", () => {
	it("reads the first song, not the whole queue", () => {
		const state = panelStateOf(fakeQueue({ songs: [song("First"), song("Second")] as never }));

		expect(state.title).toBe("First");
		expect(state.queueLength).toBe(1);
	});

	it("converts DisTube's seconds into the milliseconds the panel renders", () => {
		const state = panelStateOf(fakeQueue());

		expect(state.elapsedMs).toBe(90_000);
		expect(state.durationMs).toBe(213_000);
	});

	it("carries the artwork, uploader and requester through", () => {
		const state = panelStateOf(fakeQueue());

		expect(state.author).toBe("Rick Astley");
		expect(state.requestedBy).toBe("alice");
		expect(state.thumbnail).toBe("https://cdn.test/art.png");
	});

	/**
	 * The failure the user saw: an empty queue rendered as "Unknown track / 0:00".
	 * The mapping is allowed to degrade like this — what must not happen is the
	 * panel being rendered from an empty queue at all, which is why the finish
	 * handler now posts plain text instead.
	 */
	it("degrades rather than throwing when the queue is empty", () => {
		const state = panelStateOf(fakeQueue({ songs: [] as never, currentTime: 0 }));

		expect(state.title).toBe("Unknown track");
		expect(state.durationMs).toBe(0);
		expect(state.queueLength).toBe(0);
	});

	it("omits the optional fields rather than setting them undefined", () => {
		const bare = panelStateOf(fakeQueue({ songs: [song("Bare", { url: undefined, thumbnail: undefined })] as never }));

		expect("url" in bare).toBe(false);
		expect("thumbnail" in bare).toBe(false);
	});
});

describe("queueEntriesOf", () => {
	it("lists what is coming up, excluding what is already playing", () => {
		const entries = queueEntriesOf(fakeQueue({ songs: [song("Playing"), song("Next"), song("After")] as never }));

		expect(entries.map((entry) => entry.title)).toEqual(["Next", "After"]);
	});

	it("is empty when nothing is queued behind the current track", () => {
		expect(queueEntriesOf(fakeQueue())).toEqual([]);
	});

	it("converts each duration into milliseconds", () => {
		const [next] = queueEntriesOf(fakeQueue({ songs: [song("Playing"), song("Next")] as never }));
		expect(next?.durationMs).toBe(213_000);
	});
});
