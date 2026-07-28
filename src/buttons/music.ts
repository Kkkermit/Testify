import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { confirmRow } from "@lib/components.util";
import { music } from "@lib/music.util";
import { MUSIC_PANEL_ID, musicPanel, nextVolume, panelWithControls, queuePage } from "@lib/musicPanel.util";
import { panelStateOf, queueEntriesOf } from "@lib/musicQueue.util";

/**
 * Every transport control on the now-playing panel.
 *
 * The panel is one message that gets mutated, so every branch here ends in
 * `update()` rather than a fresh reply — the whole point of the panel is that
 * the channel does not fill up with "skipped!" messages.
 */

export default defineButton({
	id: MUSIC_PANEL_ID,

	async run(interaction, context) {
		if (!interaction.isButton()) return;
		if (interaction.guild === null) return;

		const queue = music(context.client).getQueue(interaction.guild.id);
		if (!queue) throw new UserFacingError("Nothing is playing any more.");

		// Anyone listening may drive playback; someone in another channel may not.
		const listening = interaction.guild.members.cache.get(interaction.user.id)?.voice.channelId;
		if (listening !== queue.voiceChannel?.id) {
			throw new UserFacingError("Join the voice channel to use the player controls.");
		}

		switch (context.action) {
			case "playpause":
				if (queue.paused) await queue.resume();
				else await queue.pause();
				break;

			case "skip":
				// `skip()` throws on the last track, where stopping is what is meant.
				if (queue.songs.length > 1) await queue.skip();
				else await queue.stop();
				break;

			case "prev":
				if (!queue.previousSongs.length) throw new UserFacingError("There is nothing to go back to.");
				await queue.previous();
				break;

			case "loop":
				queue.setRepeatMode((queue.repeatMode + 1) % 3);
				break;

			case "shuffle":
				await queue.shuffle();
				break;

			case "vol": {
				const [direction] = context.args;
				queue.setVolume(nextVolume(queue.volume, direction === "up" ? "up" : "down"));
				break;
			}

			case "queue": {
				const [rawPage = "0"] = context.args;
				await interaction.update(queuePage(queueEntriesOf(queue), Number.parseInt(rawPage, 10) || 0));
				return;
			}

			case "panel":
				break;

			// Destroys the queue, so it asks first.
			case "stop":
				await interaction.update(
					panelWithControls(panelStateOf(queue), [confirmRow(MUSIC_PANEL_ID, "stop", interaction.user.id)]),
				);
				return;

			case "stop-yes":
				await queue.stop();
				await interaction.update(musicPanel({ ...panelStateOf(queue), finished: true }));
				return;

			case "stop-no":
				break;

			default:
				return;
		}

		await interaction.update(musicPanel(panelStateOf(queue)));
	},
});
