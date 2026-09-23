import { type Guild, type GuildMember, type VoiceBasedChannel } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { reply } from "@lib/discord/reply.util";
import { type MusicBinaries } from "@lib/music/music.types";
import { findBinaries } from "@lib/music/musicBinaries.util";
import { findSession, type MusicSession, sessionFor } from "@lib/music/musicSession.util";

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

/** The one refusal of a volume change, since only FFmpeg can re-encode. */
export function requireVolumeControl(session: MusicSession): void {
	if (session.canSetVolume) return;

	throw new UserFacingError(
		"Changing the volume needs FFmpeg, which is not installed on this host. Run `npm run music:setup` to check.",
	);
}

export function panelFor(session: MusicSession, userId: string, note?: string, page = 0): ContainerMessage {
	return session.render(userId, note, page);
}

/**
 * Answers with the panel and keeps it live, editing through the channel because an interaction token dies after fifteen
 * minutes.
 */
export async function showPanel(
	interaction: CommandInput,
	session: MusicSession,
	note?: string,
	page = 0,
): Promise<void> {
	await reply(interaction, panelFor(session, interaction.user.id, note, page));
	await watchReply(interaction, session, page);
}

async function watchReply(interaction: CommandInput, session: MusicSession, page: number): Promise<void> {
	const channel = interaction.channel;
	if (channel === null || !("messages" in channel)) return;

	try {
		const { id } = await interaction.fetchReply();
		session.watchPanel({
			userId: interaction.user.id,
			page,
			edit: async (payload) => channel.messages.edit(id, payload),
		});
	} catch (error) {
		// A panel that cannot be found again is simply not live; the reply the person can see is unaffected.
		session.logger.debug({ err: error, guildId: session.guildId }, "[MUSIC] Could not attach the live panel.");
	}
}
