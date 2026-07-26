import { LEVELLING } from "../../config/constants";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { getRank, getUserLevel, xpForNextLevel } from "../../database/repositories/levelRepository";
import { embed } from "../../lib/embeds";
import { formatNumber, ordinal, progressBar } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "rank",
	description: "Shows your level and rank in this server.",
	category: "levelling",
	guildOnly: true,
	options: [{ name: "user", description: "Whose rank to check. Defaults to you.", type: "user" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user") ?? interaction.user;

		const record = await getUserLevel(guild.id, target.id);
		if (!record) throw new UserFacingError(`${target.username} has not earned any XP here yet.`);

		const rank = await getRank(guild.id, target.id);
		const floor = LEVELLING.xpForLevel(record.level);
		const ceiling = xpForNextLevel(record.level);
		const progress = record.xp - floor;
		const needed = ceiling - floor;

		await reply(interaction, {
			embeds: [
				embed({
					category: "levelling",
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
