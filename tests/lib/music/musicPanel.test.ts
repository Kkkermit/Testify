import { parseCustomId } from "@core/button";
import { MAX_VOLUME, MIN_VOLUME } from "@lib/music/music.constants";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	headlineFor,
	link,
	musicPanel,
	type PanelState,
	musicBar,
	progressLine,
	queueSummary,
	statusLine,
	trackLine,
	volumeStep,
} from "@lib/music/musicPanel.util";
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

function longQueue(): PanelState {
	const long = state();
	long.queue = { ...long.queue, tracks: Array.from({ length: 14 }, (_, at) => track(`t${String(at)}`)) };

	return long;
}

/** Discord counts everything in the tree, not just the rows. */
function componentCount(panel: ReturnType<typeof musicPanel>): number {
	let total = 0;
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;

		if (typeof record.type === "number") total += 1;
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};

	panel.components.forEach((component) => descend(component.toJSON()));

	return total;
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
		expect(labels(musicPanel(state(), OWNER))).not.toContain("Next page");

		expect(labels(musicPanel(longQueue(), OWNER))).toContain("Next page");
	});

	/** Discord refuses a message carrying more than forty components, which is a rejection rather than a warning. */
	it("stays inside Discord's component budget with a full page and a thumbnail", () => {
		const long = longQueue();
		long.queue = {
			...long.queue,
			tracks: long.queue.tracks.map((queued) => ({ ...queued, thumbnail: "https://cdn.test/a.jpg" })),
		};

		expect(componentCount(musicPanel({ ...long, canSetVolume: true }, OWNER))).toBeLessThanOrEqual(40);
	});

	it("numbers upcoming tracks from the one playing, so the numbers match what Remove takes", () => {
		expect(textOf(musicPanel(state(), OWNER))).toContain("`1.`");
	});

	it("says it is paused in the heading as well as on the button", () => {
		expect(textOf(musicPanel(state({ paused: true }), OWNER))).toContain("Paused");
	});

	/** Without FFmpeg nothing can re-encode, so offering the control would be a button that cannot work. */
	it("disables the volume controls when the host cannot change the level", () => {
		const buttons = buttonsOf(musicPanel(state(), OWNER));

		expect(buttons.find((entry) => entry.label === "-10%")?.disabled).toBe(true);
		expect(buttons.find((entry) => entry.label === "+10%")?.disabled).toBe(true);
	});

	it("offers the volume controls when the host can change the level", () => {
		const buttons = buttonsOf(musicPanel(state({ canSetVolume: true, volume: 100 }), OWNER));

		expect(buttons.find((entry) => entry.label === "-10%")?.disabled).toBe(false);
		expect(buttons.find((entry) => entry.label === "+10%")?.disabled).toBe(false);
	});

	it("disables whichever end of the volume range it is already at", () => {
		const loudest = buttonsOf(musicPanel(state({ canSetVolume: true, volume: MAX_VOLUME }), OWNER));
		const quietest = buttonsOf(musicPanel(state({ canSetVolume: true, volume: MIN_VOLUME }), OWNER));

		expect(loudest.find((entry) => entry.label === "+10%")?.disabled).toBe(true);
		expect(quietest.find((entry) => entry.label === "-10%")?.disabled).toBe(true);
	});

	it("carries the level it is moving to in the custom ID", () => {
		const ids = idsOf(musicPanel(state({ canSetVolume: true, volume: 100 }), OWNER));

		expect(ids).toContain(`music:volume:90:${OWNER}`);
		expect(ids).toContain(`music:volume:110:${OWNER}`);
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

describe("musicBar", () => {
	it("starts at the beginning and ends at the end", () => {
		expect(musicBar(0, 100, 10).indexOf("●")).toBe(0);
		expect(musicBar(100, 100, 10).indexOf("●")).toBe(9);
	});

	it("keeps the same width whatever it shows, so the line cannot twitch as it moves", () => {
		const widths = [0, 25, 50, 99, 100].map((played) => [...musicBar(played, 100, 12)].length);

		expect(new Set(widths)).toEqual(new Set([12]));
	});

	/** A head past the end would render a bar longer than itself, which reads as nonsense. */
	it("never runs past its own end", () => {
		expect(musicBar(999, 100, 8).indexOf("●")).toBe(7);
	});

	it("draws an empty bar rather than dividing by a length it does not have", () => {
		expect(musicBar(10, 0, 5).indexOf("●")).toBe(0);
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

	/** A relative timestamp keeps the panel moving between edits. */
	it("carries a countdown Discord animates on its own", () => {
		const now = 1_700_000_000_000;

		expect(progressLine(track("a"), 60_000, now)).toContain(`<t:${String(now / 1_000 + 120)}:R>`);
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

describe("statusLine", () => {
	it("prints the level when the host can change it", () => {
		expect(statusLine(state({ canSetVolume: true, volume: 80 }), track("a"))).toContain("80%");
	});

	/** Showing "100%" on a host that cannot re-encode promises a control that does not exist. */
	it("says the track's own level when the host cannot change it", () => {
		expect(statusLine(state(), track("a"))).toContain("track level");
	});

	it("names who asked for the track", () => {
		expect(statusLine(state(), track("a"))).toContain(`<@${OWNER}>`);
	});
});

describe("headlineFor", () => {
	it("links the title to the track", () => {
		expect(headlineFor(track("a"))).toContain("(https://youtu.be/a)");
	});
});

describe("link", () => {
	/** A title like "[Official Video]" would otherwise close the link early and print the address as text. */
	it("escapes brackets in the label", () => {
		expect(link("[Official Video]", "https://youtu.be/a")).toBe("[\\[Official Video\\]](https://youtu.be/a)");
	});

	it("gives up on an address Discord could not parse rather than printing a broken link", () => {
		expect(link("a", "https://example.test/a b")).toBe("a");
	});
});

describe("volumeStep", () => {
	it("moves by one step", () => {
		expect(volumeStep(100, 1)).toBe(110);
		expect(volumeStep(100, -1)).toBe(90);
	});

	it("cannot step past either end", () => {
		expect(volumeStep(MAX_VOLUME, 1)).toBe(MAX_VOLUME);
		expect(volumeStep(MIN_VOLUME, -1)).toBe(MIN_VOLUME);
	});
});
