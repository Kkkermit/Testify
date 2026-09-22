import { PermissionFlagsBits } from "discord.js";
import { asMember, type CommandInput, defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply } from "@lib/discord";
import {
	applyMusicSettings,
	clearUpcoming,
	currentTrack,
	LOOP_MODES,
	type LoopMode,
	MAX_VOLUME,
	MIN_VOLUME,
	MUSIC_SYSTEM_SUBCOMMAND,
	musicBinaries,
	type MusicSession,
	musicSystemPanel,
	readMusicSettings,
	removeAt,
	requireSession,
	requireVolumeControl,
	sameChannelAs,
	showPanel,
	shuffleUpcoming,
	statusLines,
	upcomingPage,
} from "@lib/music";

/** Everything about the player that is not "start something", which `/play` owns. */

const SYSTEM_ACTIONS = { enable: "enable", disable: "disable", roles: "roles" } as const;

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

	async autocomplete(interaction) {
		const typed = interaction.options.getFocused().trim().toLowerCase();
		const guildId = interaction.guildId;
		const settings = guildId === null ? null : await readMusicSettings(guildId);

		const state = settings === null ? "" : settings.enabled ? " (it is on)" : " (it is off)";
		const chosen = settings === null ? 0 : settings.djRoleIds.length;

		const offered = [
			{ name: `Turn the music system on${state}`, value: SYSTEM_ACTIONS.enable },
			{ name: `Turn the music system off${state}`, value: SYSTEM_ACTIONS.disable },
			{
				name:
					chosen === 0 ? "Choose who may use it (anybody can now)" : `Choose who may use it (${String(chosen)} roles)`,
				value: SYSTEM_ACTIONS.roles,
			},
		];

		await interaction.respond(offered.filter((choice) => choice.value.startsWith(typed)));
	},

	subcommands: [
		{
			name: "queue",
			description: "Shows what is playing and what is next.",
			aliases: ["q"],
			options: [{ name: "page", description: "Which page of the queue.", type: "integer", min: 1 }],
			async run(interaction) {
				const session = sessionOf(interaction);
				const page = (interaction.options.getInteger("page") ?? 1) - 1;

				await showPanel(interaction, session, undefined, page);
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

				await showPanel(interaction, session);
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
				await showPanel(interaction, session, `Skipped **${track.title}**.`);
			},
		},
		{
			name: "pause",
			description: "Pauses playback.",
			async run(interaction) {
				const session = sessionOf(interaction);
				if (!session.pause()) throw new UserFacingError("Nothing is playing.");

				await showPanel(interaction, session, "Paused.");
			},
		},
		{
			name: "resume",
			description: "Resumes playback.",
			async run(interaction) {
				const session = sessionOf(interaction);
				if (!session.resume()) throw new UserFacingError("Nothing is paused.");

				await showPanel(interaction, session, "Resumed.");
			},
		},
		{
			name: "stop",
			description: "Stops playing and clears the queue.",
			async run(interaction) {
				const session = sessionOf(interaction);
				session.stop();

				await showPanel(interaction, session, "Stopped.");
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
				await showPanel(interaction, session, `Loop set to **${mode}**.`);
			},
		},
		{
			name: "shuffle",
			description: "Shuffles what has not played yet.",
			async run(interaction) {
				const session = sessionOf(interaction);
				session.queue = shuffleUpcoming(session.queue);

				await showPanel(interaction, session, "Shuffled the rest of the queue.");
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
				await showPanel(interaction, session, `Removed **${track.title}**.`);
			},
		},
		{
			name: "clear",
			description: "Clears everything after the current track.",
			async run(interaction) {
				const session = sessionOf(interaction);
				const removed = upcomingPage(session.queue, 0, Number.MAX_SAFE_INTEGER).entries.length;

				session.queue = clearUpcoming(session.queue);
				await showPanel(interaction, session, `Cleared **${String(removed)}** queued tracks.`);
			},
		},
		{
			name: "volume",
			description: "Sets how loud the player is.",
			aliases: ["vol"],
			options: [
				{
					name: "percent",
					description: "0 to 200, where 100 is the track's own level.",
					type: "integer",
					min: MIN_VOLUME,
					max: MAX_VOLUME,
				},
			],
			async run(interaction) {
				const session = sessionOf(interaction);
				const wanted = interaction.options.getInteger("percent");

				if (wanted === null) {
					await showPanel(interaction, session, `Volume is **${String(session.volume)}%**.`);
					return;
				}

				requireVolumeControl(session);

				const applied = session.setVolume(wanted);
				await showPanel(
					interaction,
					session,
					`Volume set to **${String(applied)}%**. It takes a moment to take effect.`,
				);
			},
		},
		{
			name: MUSIC_SYSTEM_SUBCOMMAND,
			description: "Turns the music system on or off, and picks who may use it.",
			permissions: [PermissionFlagsBits.ManageGuild],
			options: [
				{
					name: "action",
					description: "Leave it out to open the settings panel.",
					type: "string",
					autocomplete: true,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const action = interaction.options.getString("action");

				if (action === null || action === SYSTEM_ACTIONS.roles) {
					await reply(interaction, musicSystemPanel(await readMusicSettings(guild.id), interaction.user.id));
					return;
				}

				if (action !== SYSTEM_ACTIONS.enable && action !== SYSTEM_ACTIONS.disable) {
					throw new UserFacingError("Pick one of the options the box offers — `enable`, `disable` or `roles`.");
				}

				const enabled = action === SYSTEM_ACTIONS.enable;
				const settings = await applyMusicSettings(guild.id, { enabled }, interaction.user.id);

				await reply(
					interaction,
					musicSystemPanel(settings, interaction.user.id, enabled ? "Music is on." : "Music is off."),
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
			description: "Shows which players the host has installed, and how old they are.",
			async run(interaction, client) {
				await reply(interaction, { content: statusLines(musicBinaries(client)).join("\n") });
			},
		},
	],
});
