import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { formatTrackTime } from "../../../ui/format";
import { parseDuration } from "../../moderation/services/duration";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "forward",
	description: "Skips ahead in the current track.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["ff"],
	guildOnly: true,
	options: [{ name: "amount", description: "How far ahead, for example 30s.", type: "string", required: true }],

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const delta = parseDuration(ctx.options.getString("amount", true));
		if (delta === null || delta <= 0) throw new UserFacingError("That amount is not valid. Try `30s` or `1m`.");

		const target = queue.currentTime + delta / 1_000;
		await queue.seek(Math.floor(target));

		await ctx.reply({
			embeds: [
				embed({ category: Category.Music, description: `Skipped ahead to **${formatTrackTime(target * 1_000)}**.` }),
			],
		});
	},
});
