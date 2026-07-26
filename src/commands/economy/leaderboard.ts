import { ECONOMY } from "../../config/constants";
import { defineCommand, inGuild } from "../../core/command";
import { getLeaderboard } from "../../database/repositories/economyRepository";
import { getLevelLeaderboard } from "../../database/repositories/levelRepository";
import { embed } from "../../lib/embeds";
import { formatNumber, ordinal } from "../../lib/format";
import { reply } from "../../lib/reply";

const MEDALS = ["\u{1f947}", "\u{1f948}", "\u{1f949}"];

export default defineCommand({
	name: "leaderboard",
	description: "Shows the server leaderboards.",
	category: "economy",
	guildOnly: true,
	subcommands: [
		{
			name: "economy",
			description: "Richest members in this server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const rows = await getLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const rows = await getLevelLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

				await reply(interaction, {
					embeds: [
						embed({
							category: "levelling",
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

	async run(interaction) {
		const guild = inGuild(interaction);
		const rows = await getLeaderboard(guild.id, ECONOMY.leaderboardPageSize);

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
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
