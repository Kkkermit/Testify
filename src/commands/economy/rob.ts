import { randomInt } from "node:crypto";
import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	adjustWallet,
	debitWallet,
	findAccount,
	getOrCreateAccount,
	incrementCounters,
	removeInventoryItem,
	setCooldown,
} from "@database/repositories/economyRepository";
import { embed } from "@lib/embeds";
import { formatDuration, formatNumber } from "@lib/format";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "rob",
	description: "Tries to rob another member's wallet.",
	category: "economy",
	guildOnly: true,
	options: [{ name: "user", description: "Who to rob.", type: "user", required: true }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);

		if (target.id === interaction.user.id) throw new UserFacingError(strings.economy.selfTarget);
		if (target.bot) throw new UserFacingError(strings.economy.botTarget);

		const account = await getOrCreateAccount(guild.id, interaction.user.id);
		const now = Date.now();

		if (account.lastRobbed !== null) {
			const readyAt = account.lastRobbed.getTime() + ECONOMY_COOLDOWNS.rob;
			if (now < readyAt) {
				throw new UserFacingError(`Lay low for **${formatDuration(readyAt - now)}** first.`);
			}
		}

		const victim = await findAccount(guild.id, target.id);
		if (!victim) throw new UserFacingError(strings.economy.targetNoAccount(target.username));
		if (victim.wallet < ECONOMY.robMinTargetWallet) {
			throw new UserFacingError(`${target.username} does not have enough on them to be worth robbing.`);
		}

		await setCooldown(guild.id, interaction.user.id, "rob", new Date(now));

		// A padlock is consumed atomically, so it cannot be spent twice by two
		// simultaneous robbery attempts.
		const padlocked = await removeInventoryItem(guild.id, target.id, "padlock", 1);
		if (padlocked) {
			await reply(interaction, {
				embeds: [
					embed({
						category: "economy",
						title: "Robbery failed",
						description: `${target}'s padlock held. It broke in the process, but your hands are empty.`,
					}),
				],
			});
			return;
		}

		const succeeded = Math.random() < ECONOMY.robSuccessChance;

		if (!succeeded) {
			const fine = Math.floor(account.wallet * ECONOMY.robFinePercent);
			if (fine > 0) await debitWallet(guild.id, interaction.user.id, fine);
			await incrementCounters(guild.id, interaction.user.id, { robberyFailed: 1 });

			await reply(interaction, {
				embeds: [
					embed({
						category: "economy",
						title: "Robbery failed",
						description: `You were caught and fined **${formatNumber(fine)}**.`,
					}),
				],
			});
			return;
		}

		const maximum = Math.floor(victim.wallet * 0.3);
		const stolen = randomInt(1, Math.max(2, maximum + 1));

		const taken = await debitWallet(guild.id, target.id, stolen);
		if (!taken) throw new UserFacingError("They emptied their wallet before you got there.");

		await adjustWallet(guild.id, interaction.user.id, stolen);
		await incrementCounters(guild.id, interaction.user.id, { robberySuccess: 1 });

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
					title: "Robbery successful",
					description: `You took **${formatNumber(stolen)}** from ${target}.`,
				}),
			],
		});
	},
});
