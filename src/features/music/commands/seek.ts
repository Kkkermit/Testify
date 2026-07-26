import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { formatTrackTime } from "../../../ui/format";
import { parseDuration } from "../../moderation/services/duration";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "seek",
	description: "Jumps to a position in the current track.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	options: [{ name: "position", description: "For example 90, 1m30s or 2m.", type: "string", required: true }],

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const target = parseDuration(ctx.options.getString("position", true));
		if (target === null || target < 0)
			throw new UserFacingError("That position is not valid. Try `90`, `1m30s` or `2m`.");

		const song = queue.songs[0];
		if (song && song.duration > 0 && target / 1_000 > song.duration) {
			throw new UserFacingError("That is past the end of the track.");
		}

		await queue.seek(Math.floor(target / 1_000));
		await ctx.reply({
			embeds: [embed({ category: Category.Music, description: `Jumped to **${formatTrackTime(target)}**.` })],
		});
	},
});
