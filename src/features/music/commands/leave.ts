import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

export default defineCommand({
	name: "leave",
	description: "Disconnects the bot from the voice channel.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const { distube } = requireVoice(ctx);

		if (!guild.members.me?.voice.channel) throw new UserFacingError("I am not in a voice channel.");

		distube.voices.leave(guild);
		await ctx.reply({ embeds: [embed({ category: Category.Music, description: "Left the voice channel." })] });
	},
});
