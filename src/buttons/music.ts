import { type GuildMember } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { panelFor, requireSession, sameChannelAs } from "@lib/musicActions.util";
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
			case "page": {
				page = Number(context.args.at(0) ?? 0);
				break;
			}
			default:
				return;
		}

		await interaction.update(panelFor(session, interaction.user.id, note, Number.isFinite(page) ? page : 0));
	},
});
