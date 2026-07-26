import { Category } from "../../../config/categories";
import { ECONOMY, ECONOMY_COOLDOWNS } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { CooldownError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { adjustWallet, getOrCreateAccount, setFields } from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { formatDuration, formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "daily",
	description: "Claims your daily reward.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await getOrCreateAccount(guild.id, ctx.user.id);
		const now = Date.now();

		if (account.lastDaily !== null) {
			const readyAt = account.lastDaily.getTime() + ECONOMY_COOLDOWNS.daily;
			if (now < readyAt) {
				throw new CooldownError(
					readyAt - now,
					`You have already claimed today. Come back in **${formatDuration(readyAt - now)}**.`,
				);
			}
		}

		// A gap of more than two days breaks the streak.
		const continues = account.lastDaily !== null && now - account.lastDaily.getTime() < ECONOMY_COOLDOWNS.daily * 2;
		const streak = continues ? Math.min(account.dailyStreak + 1, ECONOMY.dailyStreakCap) : 1;
		const reward = ECONOMY.dailyBase + streak * ECONOMY.dailyStreakBonus;

		await adjustWallet(guild.id, ctx.user.id, reward);
		await setFields(guild.id, ctx.user.id, { lastDaily: new Date(now), dailyStreak: streak });

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
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
