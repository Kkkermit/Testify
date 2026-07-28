import { ButtonStyle, MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import {
	MUSIC_PANEL_ID,
	musicPanel,
	nextVolume,
	type PanelState,
	panelComponents,
	panelWithControls,
	queuePage,
	repeatLabel,
	VOLUME_MAX,
} from "@lib/musicPanel.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const PLAYING: PanelState = {
	title: "Never Gonna Give You Up",
	url: "https://example.test/track",
	author: "Rick Astley",
	requestedBy: "alice",
	elapsedMs: 194_000,
	durationMs: 213_000,
	volume: 60,
	repeatMode: 0,
	paused: false,
	queueLength: 4,
};

function actionsOf(rendered: ReturnType<typeof musicPanel>): string[] {
	return idsOf(rendered).map((id) => parseCustomId(id).action);
}

describe("repeatLabel", () => {
	it.each([
		[0, "Off"],
		[1, "Track"],
		[2, "Queue"],
	])("names mode %i as %s", (mode, expected) => {
		expect(repeatLabel(mode)).toBe(expected);
	});

	it("falls back rather than showing undefined for a mode it does not know", () => {
		expect(repeatLabel(99)).toBe("Off");
	});
});

describe("nextVolume", () => {
	it("steps up and down by ten", () => {
		expect(nextVolume(60, "up")).toBe(70);
		expect(nextVolume(60, "down")).toBe(50);
	});

	it("never goes below zero", () => {
		expect(nextVolume(5, "down")).toBe(0);
	});

	it("never goes above the ceiling", () => {
		expect(nextVolume(VOLUME_MAX - 5, "up")).toBe(VOLUME_MAX);
	});
});

describe("the panel body", () => {
	it("is a Components V2 message, so the controls sit inside the block", () => {
		expect(musicPanel(PLAYING).flags).toBe(MessageFlags.IsComponentsV2);
	});

	it("shows the track, the position and a progress bar", () => {
		const rendered = textOf(musicPanel(PLAYING));

		expect(rendered).toContain("Never Gonna Give You Up");
		expect(rendered).toContain("3:14");
		expect(rendered).toContain("3:33");
	});

	it("links the title when there is a URL, and does not when there is not", () => {
		expect(textOf(musicPanel(PLAYING))).toContain("](https://example.test/track)");

		const { url: _unused, ...withoutUrl } = PLAYING;
		expect(textOf(musicPanel(withoutUrl))).not.toContain("](");
	});

	it("reports volume, repeat mode and what is queued", () => {
		const rendered = textOf(musicPanel({ ...PLAYING, repeatMode: 2 }));

		expect(rendered).toContain("60%");
		expect(rendered).toContain("Queue");
		expect(rendered).toContain("4");
	});

	it("names who asked for the track", () => {
		expect(textOf(musicPanel(PLAYING))).toContain("alice");
	});

	it("says it is paused rather than playing", () => {
		expect(textOf(musicPanel({ ...PLAYING, paused: true }))).toContain("Paused");
		expect(textOf(musicPanel(PLAYING))).toContain("Now playing");
	});

	it("says the queue ended once playback finishes", () => {
		expect(textOf(musicPanel({ ...PLAYING, finished: true }))).toContain("Queue ended");
	});

	/** The reason for V2 here: the artwork sits beside the track, not below it. */
	it("hangs the artwork off the track section when there is any", () => {
		const built = JSON.stringify(musicPanel({ ...PLAYING, thumbnail: "https://cdn.test/art.png" }).components[0]);

		expect(built).toContain("https://cdn.test/art.png");
	});

	it("renders plain text when there is no artwork", () => {
		expect(() => musicPanel(PLAYING)).not.toThrow();
		expect(textOf(musicPanel(PLAYING))).toContain("Never Gonna Give You Up");
	});

	/** A zero-length track would otherwise divide by zero in the progress bar. */
	it("survives a track with no duration", () => {
		expect(() => musicPanel({ ...PLAYING, durationMs: 0, elapsedMs: 0 })).not.toThrow();
	});
});

describe("panelComponents", () => {
	it("offers the full transport, replacing the typed commands", () => {
		expect(actionsOf(musicPanel(PLAYING))).toEqual(
			expect.arrayContaining(["prev", "playpause", "skip", "stop", "loop", "vol", "shuffle", "queue"]),
		);
	});

	it("namespaces every control to the music handler", () => {
		for (const id of idsOf(musicPanel(PLAYING))) expect(parseCustomId(id).id).toBe(MUSIC_PANEL_ID);
	});

	it("flips the play/pause icon with the state", () => {
		const playing = panelComponents(PLAYING)[0]?.components[1]?.toJSON() as { emoji?: { name?: string } };
		const paused = panelComponents({ ...PLAYING, paused: true })[0]?.components[1]?.toJSON() as {
			emoji?: { name?: string };
		};

		expect(playing.emoji?.name).not.toBe(paused.emoji?.name);
	});

	it("labels the loop button with the current mode, so it is readable at a glance", () => {
		const loop = panelComponents({ ...PLAYING, repeatMode: 2 })[0]?.components[4]?.toJSON() as { label?: string };
		expect(loop.label).toBe("Queue");
	});

	it("marks stop as destructive", () => {
		const stop = panelComponents(PLAYING)[0]?.components[3]?.toJSON() as { style?: number };
		expect(stop.style).toBe(ButtonStyle.Danger);
	});

	it("disables the volume buttons at each end", () => {
		const atZero = panelComponents({ ...PLAYING, volume: 0 })[1]?.components[0]?.toJSON() as { disabled?: boolean };
		const atMax = panelComponents({ ...PLAYING, volume: VOLUME_MAX })[1]?.components[1]?.toJSON() as {
			disabled?: boolean;
		};

		expect(atZero.disabled).toBe(true);
		expect(atMax.disabled).toBe(true);
	});

	it("disables shuffle and queue when there is nothing queued", () => {
		const row = panelComponents({ ...PLAYING, queueLength: 0 })[1];
		const shuffle = row?.components[2]?.toJSON() as { disabled?: boolean };
		const queue = row?.components[3]?.toJSON() as { disabled?: boolean };

		expect(shuffle.disabled).toBe(true);
		expect(queue.disabled).toBe(true);
	});

	/** A dead button should look dead — the gap the notes call out explicitly. */
	it("greys everything out once the queue has finished", () => {
		for (const button of buttonsOf(musicPanel({ ...PLAYING, finished: true }))) {
			expect(button.disabled).toBe(true);
		}
	});

	it("stays inside Discord's five-buttons-per-row limit", () => {
		for (const row of panelComponents(PLAYING)) expect(row.components.length).toBeLessThanOrEqual(5);
	});
});

describe("panelWithControls", () => {
	/** Stop asks before it throws the queue away, without losing the track on screen. */
	it("keeps the track visible while swapping the transport for the given controls", () => {
		const confirming = panelWithControls(PLAYING, []);

		expect(textOf(confirming)).toContain("Never Gonna Give You Up");
		expect(buttonsOf(confirming)).toHaveLength(0);
	});
});

describe("queuePage", () => {
	const entries = Array.from({ length: 25 }, (_unused, index) => ({
		title: `Track ${index + 1}`,
		durationMs: 200_000,
		requestedBy: "alice",
	}));

	it("numbers tracks by their real queue position, not their position on the page", () => {
		expect(textOf(queuePage(entries, 1))).toContain("`11.`");
	});

	it("reports the page and the total", () => {
		expect(textOf(queuePage(entries, 0))).toContain("Page 1 of 3");
	});

	it("disables previous on the first page and next on the last", () => {
		expect(buttonsOf(queuePage(entries, 0))[0]?.disabled).toBe(true);
		expect(buttonsOf(queuePage(entries, 2))[1]?.disabled).toBe(true);
	});

	it("always offers a way back to the panel", () => {
		expect(actionsOf(queuePage(entries, 0))).toContain("panel");
	});

	it("clamps a page past the end onto the last page", () => {
		expect(textOf(queuePage(entries, 99))).toContain("Page 3 of 3");
	});

	it("says so plainly when the queue is empty", () => {
		expect(textOf(queuePage([], 0))).toContain("Nothing queued.");
	});

	it("routes its arrows to the handler that knows how to page a queue", () => {
		for (const id of idsOf(queuePage(entries, 0))) expect(parseCustomId(id).id).toBe(MUSIC_PANEL_ID);
	});
});
