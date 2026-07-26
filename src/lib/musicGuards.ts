import { type GuildMember, type VoiceBasedChannel } from "discord.js";
import { type DisTube, type Queue } from "distube";
import { strings } from "../config/strings";
import { type TestifyClient } from "../core/client";
import { asMember, inGuild, type CommandInput } from "../core/command";
import { UserFacingError } from "../core/errors";
import { music } from "./music";

export interface MusicSession {
	distube: DisTube;
	member: GuildMember;
	voiceChannel: VoiceBasedChannel;
	guildId: string;
}

/** The "are you in a voice channel with me" checks every music command repeats. */
export function requireVoice(interaction: CommandInput, client: TestifyClient): MusicSession {
	const guild = inGuild(interaction);
	const member = asMember(interaction);
	const voiceChannel = member.voice.channel;

	if (!voiceChannel) throw new UserFacingError(strings.music.noVoiceChannel);

	const mine = guild.members.me?.voice.channel;
	if (mine && mine.id !== voiceChannel.id) throw new UserFacingError(strings.music.differentVoiceChannel);

	return { distube: music(client), member, voiceChannel, guildId: guild.id };
}

/** As above, but also requires something to already be playing. */
export function requireQueue(interaction: CommandInput, client: TestifyClient): MusicSession & { queue: Queue } {
	const session = requireVoice(interaction, client);
	const queue = session.distube.getQueue(session.guildId);
	if (!queue) throw new UserFacingError(strings.music.nothingPlaying);
	return { ...session, queue };
}
