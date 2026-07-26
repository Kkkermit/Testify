import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getRank, getUserLevel, xpForNextLevel } from "../../../database/repositories/levelRepository";
import { LEVELLING } from "../../../config/constants";
import { embed } from "../../../ui/embeds";
import { formatNumber, ordinal, progressBar } from "../../../ui/format";

export default defineCommand({
	name: "rank",
	description: "Shows your level and rank in this server.",
	category: Category.Levelling,
	surfaces: ["slash", "prefix"],
	aliases: ["level", "xp"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose rank to check. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user") ?? ctx.user;

		const record = await getUserLevel(guild.id, target.id);
		if (!record) throw new UserFacingError(`${target.username} has not earned any XP here yet.`);

		const rank = await getRank(guild.id, target.id);
		const floor = LEVELLING.xpForLevel(record.level);
		const ceiling = xpForNextLevel(record.level);
		const progress = record.xp - floor;
		const needed = ceiling - floor;

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Levelling,
					title: `${target.displayName}'s rank`,
					description: `${progressBar(progress, needed)}\n**${formatNumber(progress)}** / **${formatNumber(needed)}** XP to level ${record.level + 1}`,
					fields: [
						{ name: "Level", value: String(record.level), inline: true },
						{ name: "Total XP", value: formatNumber(record.xp), inline: true },
						{ name: "Rank", value: rank !== null ? ordinal(rank) : "Unranked", inline: true },
					],
					thumbnail: target.displayAvatarURL({ size: 256 }),
				}),
			],
		});
	},
});
