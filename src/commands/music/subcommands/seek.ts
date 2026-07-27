import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { parseDuration } from "../../../lib/duration";
import { embed } from "../../../lib/embeds";
import { formatTrackTime } from "../../../lib/format";
import { requireQueue } from "../../../lib/musicGuards";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "seek",
	description: "Jumps to a position in the current track.",
	category: "music",
	guildOnly: true,
	options: [{ name: "position", description: "For example 90, 1m30s or 2m.", type: "string", required: true }],

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const target = parseDuration(interaction.options.getString("position", true));
		if (target === null || target < 0)
			throw new UserFacingError("That position is not valid. Try `90`, `1m30s` or `2m`.");

		const song = queue.songs[0];
		if (song && song.duration > 0 && target / 1_000 > song.duration) {
			throw new UserFacingError("That is past the end of the track.");
		}

		await queue.seek(Math.floor(target / 1_000));
		await reply(interaction, {
			embeds: [embed({ category: "music", description: `Jumped to **${formatTrackTime(target)}**.` })],
		});
	},
});
