import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { ECONOMY, ECONOMY_COOLDOWNS } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { CooldownError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	adjustWallet,
	getOrCreateAccount,
	incrementCounters,
	setCooldown,
} from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { formatDuration, formatNumber } from "../../../ui/format";
import { findJob } from "../data/shop";

const SCENARIOS = [
	"You covered a shift and nobody noticed you were on your phone.",
	"You fixed the coffee machine and everyone treated you like a hero.",
	"You finished a rush job ahead of schedule.",
	"You cleared the backlog and got a small bonus.",
	"You worked a double and regret nothing.",
];

export default defineCommand({
	name: "work",
	description: "Works a shift for money.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await getOrCreateAccount(guild.id, ctx.user.id);
		const now = Date.now();

		if (account.lastWorked !== null) {
			const readyAt = account.lastWorked.getTime() + ECONOMY_COOLDOWNS.work;
			if (now < readyAt) {
				throw new CooldownError(
					readyAt - now,
					`You are still tired. Try again in **${formatDuration(readyAt - now)}**.`,
				);
			}
		}

		const job = findJob(account.job.toLowerCase().replace(/\s+/g, "_"));
		const base = job?.basePay ?? randomInt(ECONOMY.workMinPay, ECONOMY.workMaxPay + 1);
		const bonus = Math.floor(base * 0.1 * account.jobLevel);
		const pay = base + bonus;

		await adjustWallet(guild.id, ctx.user.id, pay);
		await setCooldown(guild.id, ctx.user.id, "work", new Date(now));
		await incrementCounters(guild.id, ctx.user.id, { worked: 1, hoursWorked: 1 });

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: `${job?.emoji ?? "\u{1f4bc}"} ${job?.name ?? "Odd jobs"}`,
					description: `${SCENARIOS[randomInt(SCENARIOS.length)]}\n\nYou earned **${formatNumber(pay)}**.`,
					fields: [
						{ name: "Base pay", value: formatNumber(base), inline: true },
						{ name: "Level bonus", value: formatNumber(bonus), inline: true },
						{ name: "Next shift", value: formatDuration(ECONOMY_COOLDOWNS.work), inline: true },
					],
				}),
			],
		});
	},
});
