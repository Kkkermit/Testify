import { asMember, type CommandInput, defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { musicBinaries, panelFor, requireSession, sameChannelAs } from "@lib/musicActions.util";
import {
	clearUpcoming,
	currentTrack,
	LOOP_MODES,
	type LoopMode,
	removeAt,
	shuffleUpcoming,
	upcomingPage,
} from "@lib/musicQueue.util";
import { type MusicSession } from "@lib/musicSession.util";
import { reply } from "@lib/reply.util";

/** Everything about the player that is not "start something", which `/play` owns. */

function sessionOf(interaction: CommandInput): MusicSession {
	const guild = inGuild(interaction);
	const session = requireSession(guild);
	sameChannelAs(session, asMember(interaction));

	return session;
}

export default defineCommand({
	name: "music",
	description: "Controls the player.",
	category: "music",
	guildOnly: true,
	subcommands: [
		{
			name: "queue",
			description: "Shows what is playing and what is next.",
			aliases: ["q"],
			options: [{ name: "page", description: "Which page of the queue.", type: "integer", min: 1 }],
			async run(interaction) {
				const session = sessionOf(interaction);
				const page = (interaction.options.getInteger("page") ?? 1) - 1;

				await reply(interaction, panelFor(session, interaction.user.id, undefined, page));
			},
		},
		{
			name: "nowplaying",
			description: "Shows the track that is playing.",
			aliases: ["np"],
			async run(interaction) {
				const session = sessionOf(interaction);
				const track = currentTrack(session.queue);
				if (track === null) throw new UserFacingError("Nothing is playing.");

				await reply(interaction, panelFor(session, interaction.user.id));
			},
		},
		{
			name: "skip",
			description: "Skips the current track.",
			aliases: ["s"],
			async run(interaction) {
				const session = sessionOf(interaction);
				const track = currentTrack(session.queue);
				if (track === null) throw new UserFacingError("Nothing is playing.");

				session.skip();
				await reply(interaction, panelFor(session, interaction.user.id, `Skipped **${track.title}**.`));
			},
		},
		{
			name: "pause",
			description: "Pauses playback.",
			async run(interaction) {
				const session = sessionOf(interaction);
				if (!session.pause()) throw new UserFacingError("Nothing is playing.");

				await reply(interaction, panelFor(session, interaction.user.id, "Paused."));
			},
		},
		{
			name: "resume",
			description: "Resumes playback.",
			async run(interaction) {
				const session = sessionOf(interaction);
				if (!session.resume()) throw new UserFacingError("Nothing is paused.");

				await reply(interaction, panelFor(session, interaction.user.id, "Resumed."));
			},
		},
		{
			name: "stop",
			description: "Stops playing and clears the queue.",
			async run(interaction) {
				const session = sessionOf(interaction);
				session.stop();

				await reply(interaction, panelFor(session, interaction.user.id, "Stopped."));
			},
		},
		{
			name: "loop",
			description: "Repeats the track, the queue, or nothing.",
			options: [
				{
					name: "mode",
					description: "What to repeat.",
					type: "string",
					required: true,
					choices: LOOP_MODES.map((mode) => ({ name: mode, value: mode })),
				},
			],
			async run(interaction) {
				const session = sessionOf(interaction);
				const mode = interaction.options.getString("mode", true) as LoopMode;

				session.setLoop(mode);
				await reply(interaction, panelFor(session, interaction.user.id, `Loop set to **${mode}**.`));
			},
		},
		{
			name: "shuffle",
			description: "Shuffles what has not played yet.",
			async run(interaction) {
				const session = sessionOf(interaction);
				session.queue = shuffleUpcoming(session.queue);

				await reply(interaction, panelFor(session, interaction.user.id, "Shuffled the rest of the queue."));
			},
		},
		{
			name: "remove",
			description: "Removes one track from the queue.",
			options: [{ name: "position", description: "Its number in the queue.", type: "integer", required: true, min: 1 }],
			async run(interaction) {
				const session = sessionOf(interaction);
				const offset = interaction.options.getInteger("position", true);
				const at = session.queue.index + offset;
				const track = session.queue.tracks[at];

				if (track === undefined) throw new UserFacingError("There is no track at that position.");

				session.queue = removeAt(session.queue, at);
				await reply(interaction, panelFor(session, interaction.user.id, `Removed **${track.title}**.`));
			},
		},
		{
			name: "clear",
			description: "Clears everything after the current track.",
			async run(interaction) {
				const session = sessionOf(interaction);
				const removed = upcomingPage(session.queue, 0, Number.MAX_SAFE_INTEGER).entries.length;

				session.queue = clearUpcoming(session.queue);
				await reply(
					interaction,
					panelFor(session, interaction.user.id, `Cleared **${String(removed)}** queued tracks.`),
				);
			},
		},
		{
			name: "leave",
			description: "Stops and leaves the voice channel.",
			aliases: ["disconnect", "dc"],
			async run(interaction) {
				const session = sessionOf(interaction);
				session.destroy();

				await reply(interaction, { content: "Left the voice channel." });
			},
		},
		{
			name: "status",
			description: "Shows which players the host has installed.",
			async run(interaction, client) {
				const found = musicBinaries(client);
				const line = (name: string, path: string | null): string =>
					path === null ? `✗ **${name}** — not found` : `✓ **${name}** — \`${path}\``;

				await reply(interaction, {
					content: [
						line("yt-dlp", found.ytDlp),
						line("FFmpeg", found.ffmpeg),
						found.ffmpeg === null ? "-# Without FFmpeg, tracks not already in Opus cannot play." : "",
					]
						.filter((part) => part !== "")
						.join("\n"),
				});
			},
		},
	],
});
