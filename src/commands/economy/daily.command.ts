import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { adjustWallet, getOrCreateAccount, setFields } from "@database/repositories/economyRepository";
import { embed } from "@lib/embeds.util";
import { formatDuration, formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "daily",
	description: "Claims your daily reward.",
	category: "economy",
	guildOnly: true,

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await getOrCreateAccount(guild.id, interaction.user.id);
		const now = Date.now();

		if (account.lastDaily !== null) {
			const readyAt = account.lastDaily.getTime() + ECONOMY_COOLDOWNS.daily;
			if (now < readyAt) {
				throw new UserFacingError(`You have already claimed today. Come back in **${formatDuration(readyAt - now)}**.`);
			}
		}

		// A gap of more than two days breaks the streak.
		const continues = account.lastDaily !== null && now - account.lastDaily.getTime() < ECONOMY_COOLDOWNS.daily * 2;
		const streak = continues ? Math.min(account.dailyStreak + 1, ECONOMY.dailyStreakCap) : 1;
		const reward = ECONOMY.dailyBase + streak * ECONOMY.dailyStreakBonus;

		await adjustWallet(guild.id, interaction.user.id, reward);
		await setFields(guild.id, interaction.user.id, { lastDaily: new Date(now), dailyStreak: streak });

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
					title: "Daily reward",
					description: `You collected **${formatNumber(reward)}**.`,
					fields: [
						{ name: "Streak", value: `${streak} day(s)`, inline: true },
						{ name: "Next claim", value: formatDuration(ECONOMY_COOLDOWNS.daily), inline: true },
					],
				}),
			],
		});
	},
});
