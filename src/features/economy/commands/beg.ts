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

export default defineCommand({
	name: "beg",
	description: "Asks strangers for spare change.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await getOrCreateAccount(guild.id, ctx.user.id);
		const now = Date.now();

		if (account.lastBegged !== null) {
			const readyAt = account.lastBegged.getTime() + ECONOMY_COOLDOWNS.beg;
			if (now < readyAt) {
				throw new CooldownError(readyAt - now, `Give it a rest. Try again in **${formatDuration(readyAt - now)}**.`);
			}
		}

		const amount = randomInt(ECONOMY.begMin, ECONOMY.begMax + 1);
		if (amount > 0) await adjustWallet(guild.id, ctx.user.id, amount);
		await setCooldown(guild.id, ctx.user.id, "beg", new Date(now));
		await incrementCounters(guild.id, ctx.user.id, { begged: 1 });

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: "Begging",
					description:
						amount > 0
							? `Someone took pity on you and handed over **${formatNumber(amount)}**.`
							: "Nobody gave you anything. Better luck next time.",
				}),
			],
		});
	},
});
