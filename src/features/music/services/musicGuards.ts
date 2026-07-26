import { type GuildMember, type VoiceBasedChannel } from "discord.js";
import { type DisTube, type Queue } from "distube";
import { strings } from "../../../config/strings";
import { type CommandContext } from "../../../core/context";
import { UserFacingError } from "../../../core/errors";
import { requireGuild, requireMember } from "../../../core/guards";
import { getMusicClient } from "../../../integrations/music";

export interface MusicSession {
	distube: DisTube;
	member: GuildMember;
	voiceChannel: VoiceBasedChannel;
	guildId: string;
}

/** The "are you in a voice channel with me" checks every music command repeats. */
export function requireVoice(ctx: CommandContext): MusicSession {
	const guild = requireGuild(ctx);
	const member = requireMember(ctx);
	const voiceChannel = member.voice.channel;

	if (!voiceChannel) throw new UserFacingError(strings.music.noVoiceChannel);

	const mine = guild.members.me?.voice.channel;
	if (mine && mine.id !== voiceChannel.id) throw new UserFacingError(strings.music.differentVoiceChannel);

	return { distube: getMusicClient(ctx.client), member, voiceChannel, guildId: guild.id };
}

/** As above, but also requires something to already be playing. */
export function requireQueue(ctx: CommandContext): MusicSession & { queue: Queue } {
	const session = requireVoice(ctx);
	const queue = session.distube.getQueue(session.guildId);
	if (!queue) throw new UserFacingError(strings.music.nothingPlaying);
	return { ...session, queue };
}
