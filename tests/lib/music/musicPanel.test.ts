import { parseCustomId } from "@core/button";
import { MAX_VOLUME, MIN_VOLUME, MUSIC_ADD_ID, MUSIC_ID } from "@lib/music/music.constants";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	link,
	musicPanel,
	type PanelState,
	musicBar,
	progressLine,
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
	/** A finished queue used to keep its last song on show as though it were still playing. */
	it("says the queue has finished, and offers the last song again", () => {
		const done = musicPanel(state({ queue: { tracks: [track("a")], index: 1, loop: "off" } }), OWNER);

		expect(textOf(done)).toContain("The queue has finished");
		expect(labels(done)).toEqual(["Add to queue", "Play the last one again"]);
	});

	/** The router compares the last argument, so a missing owner would let anybody drive somebody else's panel. */
	it("puts the invoking user last in every player control's custom ID", () => {
		const player = idsOf(musicPanel(state(), OWNER)).filter((id) => parseCustomId(id).id === MUSIC_ID);

		expect(player.length).toBeGreaterThan(5);
		for (const id of player) {
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	/** Anybody in the channel may add a song, so the button carries no owner for the router to hold them to. */
	it("offers Add to queue to everybody, not only the panel's owner", () => {
		const add = idsOf(musicPanel(state(), OWNER)).find((id) => parseCustomId(id).id === MUSIC_ADD_ID);

		expect(add).toBe(`${MUSIC_ADD_ID}:open`);
	});

	it("gives every control its own custom ID", () => {
		expect(duplicateIds(musicPanel(state(), OWNER))).toEqual([]);
	});

	/** Shuffling one remaining track is a no-op that looks broken, so the control says so. */
	it("disables shuffle when there is nothing worth shuffling", () => {
		const nearlyDone = state();
		nearlyDone.queue = { ...nearlyDone.queue, index: 2 };
		const shuffle = buttonsOf(musicPanel(nearlyDone, OWNER)).find((b) => String(b.label) === "Shuffle");

		expect(shuffle?.disabled).toBe(true);
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

	/** Without FFmpeg nothing can re-encode, so offering the control would be a button that cannot work. */
	it("disables the volume controls when the host cannot change the level", () => {
		const buttons = buttonsOf(musicPanel(state(), OWNER));

		expect(buttons.find((entry) => entry.label === "-10%")?.disabled).toBe(true);
		expect(buttons.find((entry) => entry.label === "+10%")?.disabled).toBe(true);
	});

	it("carries the level it is moving to in the custom ID", () => {
		const ids = idsOf(musicPanel(state({ canSetVolume: true, volume: 100 }), OWNER));

		expect(ids).toContain(`music:volume:90:${OWNER}`);
		expect(ids).toContain(`music:volume:110:${OWNER}`);
	});

	/** A container cannot carry an embed, so a thumbnail has to be a section rather than an image field. */
	it("renders a thumbnail without breaking the container", () => {
		const withArt = state();
		withArt.queue = { ...withArt.queue, tracks: [track("a", { thumbnail: "https://cdn.test/a.jpg" })], index: 0 };

		expect(() => musicPanel(withArt, OWNER)).not.toThrow();
	});
});

describe("trackLine", () => {
	/** A 200-character title would push the length off the row it belongs to. */
	it("truncates a very long title", () => {
		expect(trackLine(track("x".repeat(200))).length).toBeLessThan(140);
	});
});

describe("musicBar", () => {
	it("keeps the same width whatever it shows, so the line cannot twitch as it moves", () => {
		const widths = [0, 25, 50, 99, 100].map((played) => [...musicBar(played, 100, 12)].length);

		expect(new Set(widths)).toEqual(new Set([12]));
	});

	/** A head past the end would render a bar longer than itself, which reads as nonsense. */
	it("never runs past its own end", () => {
		expect(musicBar(999, 100, 8).indexOf("●")).toBe(7);
	});
});

describe("progressLine", () => {
	/** A relative timestamp keeps counting down in every reader's client, so while paused it said the track was ending. */
	it("says paused rather than counting down while paused", () => {
		const line = progressLine(track("a"), 60_000, 1_700_000_000_000, true);

		expect(line).toContain("Paused");
		expect(line).toContain("2:00 left");
		expect(line).not.toContain("<t:");
	});

	it("puts the paused line on the panel itself", () => {
		const shown = textOf(musicPanel(state({ paused: true }), OWNER));

		expect(shown).not.toContain("<t:");
		expect(shown).toContain("left");
	});

	/** A resource can report slightly past the end, and a bar longer than itself renders as nonsense. */
	it("never reports further than the track is long", () => {
		expect(progressLine(track("a"), 999_999)).toContain("3:00");
	});

	/** A relative timestamp keeps the panel moving between edits. */
	it("carries a countdown Discord animates on its own", () => {
		const now = 1_700_000_000_000;

		expect(progressLine(track("a"), 60_000, now)).toContain(`<t:${String(now / 1_000 + 120)}:R>`);
	});
});

describe("statusLine", () => {
	/** Showing "100%" on a host that cannot re-encode promises a control that does not exist. */
	it("says the track's own level when the host cannot change it", () => {
		expect(statusLine(state(), track("a"))).toContain("track level");
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
	it("cannot step past either end", () => {
		expect(volumeStep(MAX_VOLUME, 1)).toBe(MAX_VOLUME);
		expect(volumeStep(MIN_VOLUME, -1)).toBe(MIN_VOLUME);
	});
});
