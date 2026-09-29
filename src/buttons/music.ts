import { type GuildMember, PermissionFlagsBits } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	applyMusicSettings,
	clampVolume,
	type LoopMode,
	loopPlayer,
	MUSIC_ID,
	MUSIC_LIMITS,
	musicSystemPanel,
	pausePlayer,
	readMusicSettings,
	requireSession,
	resumePlayer,
	sameChannelAs,
	setPlayerVolume,
	shufflePlayer,
	skipTrack,
	stopPlayer,
} from "@lib/music";

/** The controls under the player, acting on the same session `/music` does. */

/** Pressing Loop walks the modes rather than opening a menu for three options. */
const NEXT_LOOP: Record<LoopMode, LoopMode> = { off: "track", track: "queue", queue: "off" };

const SYSTEM_ACTIONS = new Set(["system-on", "system-off", "djroles"]);

/** Re-read on every press, because the panel outlives the permission it was rendered with. */
function requireManager(member: GuildMember): void {
	if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

	throw new UserFacingError("You need the Manage Server permission to change the music system.");
}

async function runSystemAction(interaction: ComponentInteraction, action: string): Promise<void> {
	const guild = interaction.guild;
	if (guild === null || !interaction.isMessageComponent()) return;

	requireManager(interaction.member as GuildMember);

	let note: string;

	if (action === "djroles") {
		if (!interaction.isRoleSelectMenu()) return;

		const djRoleIds = interaction.values.slice(0, MUSIC_LIMITS.maxDjRoles);
		await applyMusicSettings(guild.id, { djRoleIds }, interaction.user.id);
		note = djRoleIds.length === 0 ? "Opened the player up to everybody." : "Updated the DJ roles.";
	} else {
		const enabled = action === "system-on";
		await applyMusicSettings(guild.id, { enabled }, interaction.user.id);
		note = enabled ? "Music is on." : "Music is off.";
	}

	await interaction.update(musicSystemPanel(await readMusicSettings(guild.id), interaction.user.id, note));
}

export default defineButton({
	id: MUSIC_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// The system settings do not need a player, and refusing them for want of one would be a trap.
		if (SYSTEM_ACTIONS.has(context.action)) {
			await runSystemAction(interaction, context.action);
			return;
		}

		if (!interaction.isButton()) return;

		const session = requireSession(guild);
		sameChannelAs(session, interaction.member as GuildMember);

		let note: string | undefined;
		let page = 0;

		switch (context.action) {
			case "pause":
				note = pausePlayer(session);
				break;
			case "resume":
				note = resumePlayer(session);
				break;
			case "previous": {
				if (session.queue.tracks.length === 0) throw new UserFacingError("Nothing has been played yet.");
				session.previous();
				note = session.queue.index === 0 ? "Started this one again." : "Back a track.";
				break;
			}
			case "skip":
				note = skipTrack(session);
				break;
			case "stop":
				note = stopPlayer(session);
				break;
			case "loop":
				note = loopPlayer(session, NEXT_LOOP[session.queue.loop]);
				break;
			case "shuffle":
				note = shufflePlayer(session);
				break;
			case "volume":
				note = setPlayerVolume(session, clampVolume(Number(context.args.at(0))));
				break;
			case "refresh": {
				break;
			}
			case "page": {
				page = Number(context.args.at(0) ?? 0);
				break;
			}
			default:
				return;
		}

		const shown = Number.isFinite(page) ? page : 0;
		// Deferred, because a track that has just changed may still be drawing its card when the three seconds run out.
		await interaction.deferUpdate();
		const { payload, cardFor } = await session.panelMessage(interaction.user.id, note, shown);
		session.rememberCard(cardFor, await interaction.editReply(payload));
		// The live panel follows whichever page was last looked at, so a tick cannot snap it back.
		session.watchPanel({
			userId: interaction.user.id,
			page: shown,
			edit: async (payload) => interaction.message.edit(payload),
		});
	},
});
