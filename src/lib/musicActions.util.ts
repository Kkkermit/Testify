import { type Guild, type GuildMember, type VoiceBasedChannel } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage } from "@lib/containers.util";
import { findBinaries, type MusicBinaries } from "@lib/musicBinaries.util";
import { musicPanel } from "@lib/musicPanel.util";
import { findSession, type MusicSession, sessionFor } from "@lib/musicSession.util";

/** What `/play`, the `/music` subcommands and the panel buttons all need, written once. */

let cached: MusicBinaries | null = null;

/** Memoised because locating a binary runs it, and doing that per command would be absurd. */
export function musicBinaries(client: TestifyClient): MusicBinaries {
	cached ??= findBinaries(client.env);

	return cached;
}

export function resetMusicBinaries(): void {
	cached = null;
}

/** The voice channel the person is in, or advice on what to do about not being in one. */
export function voiceChannelOf(member: GuildMember): VoiceBasedChannel {
	const channel = member.voice.channel;
	if (channel === null) throw new UserFacingError("Join a voice channel first, then try again.");

	return channel;
}

/** Refuses a control aimed at somebody else's session, which is how two channels stay independent. */
export function sameChannelAs(session: MusicSession, member: GuildMember): void {
	const listening = session.channelId;
	if (listening === null) return;

	if (member.voice.channelId !== listening) {
		throw new UserFacingError("You need to be in the voice channel Testify is playing in.");
	}
}

export function openSession(guild: Guild, client: TestifyClient): MusicSession {
	return sessionFor(guild, musicBinaries(client), client.logger);
}

export function requireSession(guild: Guild): MusicSession {
	const session = findSession(guild.id);
	if (session === null) throw new UserFacingError("Nothing is playing. Use `/play` to start something.");

	return session;
}

export function panelFor(session: MusicSession, userId: string, note?: string, page = 0): ContainerMessage {
	return musicPanel({ queue: session.queue, playedMs: session.playedMs, paused: session.paused, page, note }, userId);
}
