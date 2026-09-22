import { parseCustomId } from "@core/button";
import { musicPanel, type PanelState, progressLine, queueSummary, trackLine } from "@lib/musicPanel.util";
import { type QueueState, type Track } from "@lib/musicQueue.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

function track(title: string, overrides: Partial<Track> = {}): Track {
	return {
		url: `https://youtu.be/${title}`,
		title,
		author: "Artist",
		durationMs: 180_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: OWNER,
		...overrides,
	};
}

function state(overrides: Partial<PanelState> = {}): PanelState {
	const queue: QueueState = { tracks: [track("a"), track("b"), track("c")], index: 0, loop: "off" };

	return { queue, playedMs: 30_000, paused: false, page: 0, ...overrides };
}

function labels(panel: ReturnType<typeof musicPanel>): string[] {
	return buttonsOf(panel).map((entry) => String(entry.label));
}

describe("musicPanel", () => {
	it("names the track that is playing", () => {
		expect(textOf(musicPanel(state(), OWNER))).toContain("a");
	});

	it("says so plainly when nothing is playing", () => {
		const empty = musicPanel(state({ queue: { tracks: [], index: -1, loop: "off" } }), OWNER);

		expect(textOf(empty)).toContain("Nothing is playing");
		expect(buttonsOf(empty)).toEqual([]);
	});

	/** The router compares the last argument, so a missing owner would let anybody drive somebody else's panel. */
	it("puts the invoking user last in every custom ID", () => {
		for (const id of idsOf(musicPanel(state(), OWNER))) {
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	it("gives every control its own custom ID", () => {
		expect(duplicateIds(musicPanel(state(), OWNER))).toEqual([]);
	});

	it("offers Pause while playing and Resume while paused", () => {
		expect(labels(musicPanel(state(), OWNER))).toContain("Pause");
		expect(labels(musicPanel(state({ paused: true }), OWNER))).toContain("Resume");
	});

	it("shows the loop mode on the button rather than making it guesswork", () => {
		const looped = state();
		looped.queue = { ...looped.queue, loop: "queue" };

		expect(labels(musicPanel(looped, OWNER))).toContain("Loop: queue");
	});

	/** Shuffling one remaining track is a no-op that looks broken, so the control says so. */
	it("disables shuffle when there is nothing worth shuffling", () => {
		const nearlyDone = state();
		nearlyDone.queue = { ...nearlyDone.queue, index: 2 };
		const shuffle = buttonsOf(musicPanel(nearlyDone, OWNER)).find((b) => String(b.label) === "Shuffle");

		expect(shuffle?.disabled).toBe(true);
	});

	it("pages the queue only when there is more than one page", () => {
		expect(labels(musicPanel(state(), OWNER))).not.toContain("Next");

		const long = state();
		long.queue = { ...long.queue, tracks: Array.from({ length: 14 }, (_, at) => track(`t${String(at)}`)) };

		expect(labels(musicPanel(long, OWNER))).toContain("Next");
	});

	it("numbers upcoming tracks from the one playing, so the numbers match what Remove takes", () => {
		expect(textOf(musicPanel(state(), OWNER))).toContain("`1.`");
	});

	it("shows a note from the last press when there is one", () => {
		expect(textOf(musicPanel(state({ note: "Skipped." }), OWNER))).toContain("Skipped.");
	});

	/** A container cannot carry an embed, so a thumbnail has to be a section rather than an image field. */
	it("renders a thumbnail without breaking the container", () => {
		const withArt = state();
		withArt.queue = { ...withArt.queue, tracks: [track("a", { thumbnail: "https://cdn.test/a.jpg" })], index: 0 };

		expect(() => musicPanel(withArt, OWNER)).not.toThrow();
	});
});

describe("trackLine", () => {
	it("shows the length", () => {
		expect(trackLine(track("a"))).toContain("3:00");
	});

	it("says live rather than printing a wrong length", () => {
		expect(trackLine(track("a", { durationMs: null }))).toContain("live");
	});

	/** A 200-character title would push the length off the row it belongs to. */
	it("truncates a very long title", () => {
		expect(trackLine(track("x".repeat(200))).length).toBeLessThan(140);
	});

	it("omits the author when there is not one", () => {
		expect(trackLine(track("a", { author: null }))).not.toContain("—");
	});
});

describe("progressLine", () => {
	it("draws where the track has got to", () => {
		expect(progressLine(track("a"), 90_000)).toContain("1:30");
	});

	/** A resource can report slightly past the end, and a bar longer than itself renders as nonsense. */
	it("never reports further than the track is long", () => {
		expect(progressLine(track("a"), 999_999)).toContain("3:00");
	});

	it("says live for a stream with no end", () => {
		expect(progressLine(track("a", { durationMs: null }), 5_000)).toContain("live");
	});
});

describe("queueSummary", () => {
	it("counts what is still to come", () => {
		expect(queueSummary({ tracks: [track("a"), track("b")], index: 0, loop: "off" })).toContain("1");
	});

	it("says when nothing follows", () => {
		expect(queueSummary({ tracks: [track("a")], index: 0, loop: "off" })).toContain("Nothing queued");
	});

	it("does not invent a total when part of the queue is live", () => {
		const queue: QueueState = { tracks: [track("a"), track("b", { durationMs: null })], index: 0, loop: "off" };

		expect(queueSummary(queue)).toContain("live");
	});
});
