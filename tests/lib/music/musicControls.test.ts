import { UserFacingError } from "@core/errors";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	loopPlayer,
	pausePlayer,
	resumePlayer,
	setPlayerVolume,
	shufflePlayer,
	skipTrack,
	stopPlayer,
} from "@lib/music/musicControls.util";
import { type MusicSession } from "@lib/music/musicSession.util";

function track(title: string): Track {
	return {
		url: `https://youtu.be/${title}`,
		title,
		author: null,
		durationMs: 180_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
	};
}

function session(queue: QueueState, overrides: Partial<Record<keyof MusicSession, unknown>> = {}) {
	return {
		queue,
		canSetVolume: true,
		pause: jest.fn(() => true),
		resume: jest.fn(() => true),
		skip: jest.fn(),
		stop: jest.fn(),
		setLoop: jest.fn(),
		setVolume: jest.fn((level: number) => level),
		...overrides,
	} as unknown as MusicSession;
}

const playing: QueueState = { tracks: [track("now"), track("next"), track("later")], index: 0, loop: "off" };
const empty: QueueState = { tracks: [], index: -1, loop: "off" };

describe("the player controls", () => {
	/** The command and the panel's buttons both answer with these, so a refusal cannot read differently on each. */
	it("refuses to pause or resume a player that is not in that state", () => {
		expect(() => pausePlayer(session(playing, { pause: () => false }))).toThrow(
			new UserFacingError("Nothing is playing."),
		);
		expect(() => resumePlayer(session(playing, { resume: () => false }))).toThrow(
			new UserFacingError("Nothing is paused."),
		);
		expect(pausePlayer(session(playing))).toBe("Paused.");
		expect(resumePlayer(session(playing))).toBe("Resumed.");
	});

	it("names the track it skipped, and refuses when nothing is playing", () => {
		const current = session(playing);

		expect(skipTrack(current)).toBe("Skipped **now**.");
		expect(current.skip).toHaveBeenCalled();
		expect(() => skipTrack(session(empty))).toThrow(/Nothing is playing/);
	});

	it("stops, loops and shuffles", () => {
		const current = session(playing);

		expect(stopPlayer(current)).toBe("Stopped.");
		expect(current.stop).toHaveBeenCalled();
		expect(loopPlayer(current, "queue")).toBe("Loop set to **queue**.");
		expect(current.setLoop).toHaveBeenCalledWith("queue");
		expect(shufflePlayer(current)).toBe("Shuffled the rest of the queue.");
		expect(current.queue.tracks[0]?.title).toBe("now");
	});

	it("reports the level the player actually applied", () => {
		const clamped = session(playing, { setVolume: () => 200 });

		expect(setPlayerVolume(clamped, 500)).toBe("Volume set to **200%**. It takes a moment to take effect.");
	});

	/** Only FFmpeg can re-encode, so a host without it must say so rather than claim a level it cannot apply. */
	it("refuses a volume change on a host without FFmpeg", () => {
		const noFfmpeg = session(playing, { canSetVolume: false });

		expect(() => setPlayerVolume(noFfmpeg, 80)).toThrow(/FFmpeg/);
		expect(noFfmpeg.setVolume).not.toHaveBeenCalled();
	});
});
