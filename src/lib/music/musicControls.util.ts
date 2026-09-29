import { UserFacingError } from "@core/errors";
import { type LoopMode } from "@lib/music/music.types";
import { requireVolumeControl } from "@lib/music/musicActions.util";
import { currentTrack, shuffleUpcoming } from "@lib/music/musicQueue.util";
import { type MusicSession } from "@lib/music/musicSession.util";

/** The player's controls, each returning the line the panel shows, so `/music` and the buttons answer alike. */

export function pausePlayer(session: MusicSession): string {
	if (!session.pause()) throw new UserFacingError("Nothing is playing.");
	return "Paused.";
}

export function resumePlayer(session: MusicSession): string {
	if (!session.resume()) throw new UserFacingError("Nothing is paused.");
	return "Resumed.";
}

export function skipTrack(session: MusicSession): string {
	const track = currentTrack(session.queue);
	if (track === null) throw new UserFacingError("Nothing is playing.");

	session.skip();
	return `Skipped **${track.title}**.`;
}

export function stopPlayer(session: MusicSession): string {
	session.stop();
	return "Stopped.";
}

export function loopPlayer(session: MusicSession, mode: LoopMode): string {
	session.setLoop(mode);
	return `Loop set to **${mode}**.`;
}

export function shufflePlayer(session: MusicSession): string {
	session.queue = shuffleUpcoming(session.queue);
	return "Shuffled the rest of the queue.";
}

export function setPlayerVolume(session: MusicSession, percent: number): string {
	requireVolumeControl(session);
	return `Volume set to **${String(session.setVolume(percent))}%**. It takes a moment to take effect.`;
}
