import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { parseDuration } from "../../../lib/duration";
import { embed } from "../../../lib/embeds";
import { formatTrackTime } from "../../../lib/format";
import { requireQueue } from "../../../lib/musicGuards";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "rewind",
	description: "Jumps backwards in the current track.",
	category: "music",
	guildOnly: true,
	options: [{ name: "amount", description: "How far back, for example 30s.", type: "string", required: true }],

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const delta = parseDuration(interaction.options.getString("amount", true));
		if (delta === null || delta <= 0) throw new UserFacingError("That amount is not valid. Try `30s` or `1m`.");

		const target = Math.max(0, queue.currentTime - delta / 1_000);
		await queue.seek(Math.floor(target));

		await reply(interaction, {
			embeds: [embed({ category: "music", description: `Rewound to **${formatTrackTime(target * 1_000)}**.` })],
		});
	},
});
