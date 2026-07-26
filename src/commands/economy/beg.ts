import { randomInt } from "node:crypto";
import { ECONOMY, ECONOMY_COOLDOWNS } from "../../config/constants";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import {
	adjustWallet,
	getOrCreateAccount,
	incrementCounters,
	setCooldown,
} from "../../database/repositories/economyRepository";
import { embed } from "../../lib/embeds";
import { formatDuration, formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "beg",
	description: "Asks strangers for spare change.",
	category: "economy",
	guildOnly: true,

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await getOrCreateAccount(guild.id, interaction.user.id);
		const now = Date.now();

		if (account.lastBegged !== null) {
			const readyAt = account.lastBegged.getTime() + ECONOMY_COOLDOWNS.beg;
			if (now < readyAt) {
				throw new UserFacingError(`Give it a rest. Try again in **${formatDuration(readyAt - now)}**.`);
			}
		}

		const amount = randomInt(ECONOMY.begMin, ECONOMY.begMax + 1);
		if (amount > 0) await adjustWallet(guild.id, interaction.user.id, amount);
		await setCooldown(guild.id, interaction.user.id, "beg", new Date(now));
		await incrementCounters(guild.id, interaction.user.id, { begged: 1 });

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
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
