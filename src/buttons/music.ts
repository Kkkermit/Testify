import { type GuildMember } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { panelFor, requireSession, requireVolumeControl, sameChannelAs } from "@lib/musicActions.util";
import { clampVolume } from "@lib/musicFormat.util";
import { MUSIC_ID } from "@lib/musicPanel.util";
import { currentTrack, type LoopMode, shuffleUpcoming } from "@lib/musicQueue.util";

/** The controls under the player, acting on the same session `/music` does. */

/** Pressing Loop walks the modes rather than opening a menu for three options. */
const NEXT_LOOP: Record<LoopMode, LoopMode> = { off: "track", track: "queue", queue: "off" };

export default defineButton({
	id: MUSIC_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isButton()) return;

		const session = requireSession(guild);
		sameChannelAs(session, interaction.member as GuildMember);

		// Re-read rather than trusting the message: it may have been rendered several tracks ago.
		const track = currentTrack(session.queue);
		let note: string | undefined;
		let page = 0;

		switch (context.action) {
			case "pause": {
				if (!session.pause()) throw new UserFacingError("Nothing is playing.");
				note = "Paused.";
				break;
			}
			case "resume": {
				if (!session.resume()) throw new UserFacingError("Nothing is paused.");
				note = "Resumed.";
				break;
			}
			case "previous": {
				if (track === null) throw new UserFacingError("Nothing is playing.");
				session.previous();
				note = session.queue.index === 0 ? "Started this one again." : "Back a track.";
				break;
			}
			case "skip": {
				if (track === null) throw new UserFacingError("Nothing is playing.");
				session.skip();
				note = `Skipped **${track.title}**.`;
				break;
			}
			case "stop": {
				session.stop();
				note = "Stopped.";
				break;
			}
			case "loop": {
				const mode = NEXT_LOOP[session.queue.loop];
				session.setLoop(mode);
				note = `Loop set to **${mode}**.`;
				break;
			}
			case "shuffle": {
				session.queue = shuffleUpcoming(session.queue);
				note = "Shuffled the rest of the queue.";
				break;
			}
			case "volume": {
				requireVolumeControl(session);

				const wanted = clampVolume(Number(context.args.at(0)));
				note = `Volume set to **${String(session.setVolume(wanted))}%**. It takes a moment to take effect.`;
				break;
			}
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
		await interaction.update(panelFor(session, interaction.user.id, note, shown));
		// The live panel follows whichever page was last looked at, so a tick cannot snap it back.
		session.watchPanel({
			userId: interaction.user.id,
			page: shown,
			edit: async (payload) => interaction.message.edit(payload),
		});
	},
});
