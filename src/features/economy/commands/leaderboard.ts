import { Category } from "../../../config/categories";
import { ECONOMY } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { requireGuild } from "../../../core/guards";
import { getLeaderboard } from "../../../database/repositories/economyRepository";
import { getLevelLeaderboard } from "../../../database/repositories/levelRepository";
import { embed } from "../../../ui/embeds";
import { formatNumber, ordinal } from "../../../ui/format";

const MEDALS = ["\u{1f947}", "\u{1f948}", "\u{1f949}"];

export default defineCommand({
	name: "leaderboard",
	description: "Shows the server leaderboards.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["lb", "top"],
	guildOnly: true,
	subcommands: [
		{
			name: "economy",
			description: "Richest members in this server.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const rows = await getLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
							title: `Richest members in ${guild.name}`,
							description:
								rows
									.map(
										(row, index) =>
											`${MEDALS[index] ?? `\`${ordinal(index + 1)}\``} <@${row.userId}> \u2014 **${formatNumber(row.total)}**`,
									)
									.join("\n") || "Nobody has an account here yet.",
						}),
					],
				});
			},
		},
		{
			name: "levels",
			description: "Highest levels in this server.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const rows = await getLevelLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Levelling,
							title: `Top levels in ${guild.name}`,
							description:
								rows
									.map(
										(row, index) =>
											`${MEDALS[index] ?? `\`${ordinal(index + 1)}\``} <@${row.userId}> \u2014 level **${row.level}** (${formatNumber(row.xp)} XP)`,
									)
									.join("\n") || "Nobody has earned XP here yet.",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const rows = await getLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: `Richest members in ${guild.name}`,
					description:
						rows
							.map(
								(row, index) =>
									`${MEDALS[index] ?? `\`${ordinal(index + 1)}\``} <@${row.userId}> \u2014 **${formatNumber(row.total)}**`,
							)
							.join("\n") || "Nobody has an account here yet.",
				}),
			],
		});
	},
});
