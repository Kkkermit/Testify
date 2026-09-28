import { type ColorResolvable, type User } from "discord.js";
import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { strings } from "@config/strings";
import { theme } from "@config/theme";
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
import { embed, reply } from "@lib/discord";
import { planRobbery } from "@lib/economy";
import { discordTime, escapeMarkdown, formatDuration, formatNumber } from "@lib/format";

interface Told {
	title: string;
	line: string;
	result: string;
	colour: ColorResolvable;
	wallet: number | null;
}

function robberyEmbed(robber: User, target: User, told: Told, nextTry: number) {
	return embed({
		colour: told.colour,
		author: { name: robber.username, iconURL: robber.displayAvatarURL() },
		title: told.title,
		description: told.line,
		thumbnail: target.displayAvatarURL(),
		fields: [
			{ name: "Target", value: `<@${target.id}> · **@${escapeMarkdown(target.username)}**`, inline: true },
			{ name: "Result", value: told.result, inline: true },
			...(told.wallet === null ? [] : [{ name: "Your wallet", value: formatNumber(told.wallet), inline: true }]),
			{ name: "Next try", value: discordTime(nextTry, "R"), inline: true },
		],
	});
}

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
		const nextTry = now + ECONOMY_COOLDOWNS.rob;
		const name = `**${escapeMarkdown(target.displayName)}**`;
		const send = async (told: Told): Promise<void> => {
			await reply(interaction, {
				embeds: [robberyEmbed(interaction.user, target, told, nextTry)],
				allowedMentions: { parse: [] },
			});
		};

		// Consumed atomically, so two simultaneous robberies cannot both spend one padlock.
		const padlocked = await removeInventoryItem(guild.id, target.id, "padlock", 1);
		if (padlocked) {
			await incrementCounters(guild.id, interaction.user.id, { robberyFailed: 1 });
			await send({
				title: `🔒 ${target.displayName}'s padlock held`,
				line: `You went for ${name}'s wallet, but their padlock held. It broke in the process, so next time it will not.`,
				result: "Nothing taken, nothing lost",
				colour: theme.colours.warning,
				wallet: null,
			});
			return;
		}

		const plan = planRobbery({ robber: account.wallet, target: victim.wallet });
		const line = (amount: number): string =>
			plan.line.replaceAll("{target}", name).replaceAll("{amount}", formatNumber(amount));

		if (plan.rule.success) {
			const taken = await debitWallet(guild.id, target.id, plan.amount);
			if (!taken) throw new UserFacingError(`${target.username} emptied their wallet before you got there.`);

			const after = await adjustWallet(guild.id, interaction.user.id, plan.amount);
			await incrementCounters(guild.id, interaction.user.id, { robberySuccess: 1 });
			await send({
				title: `💰 You robbed ${target.displayName}`,
				line: line(plan.amount),
				result: `+${formatNumber(plan.amount)}`,
				colour: theme.colours.success,
				wallet: after.wallet,
			});
			return;
		}

		// A fine is taken only if the wallet still holds it; one spent since the robbery began costs nothing.
		const paid = plan.amount > 0 ? await debitWallet(guild.id, interaction.user.id, plan.amount) : null;
		const lost = paid === null ? 0 : plan.amount;
		if (lost > 0 && plan.rule.toTarget === true) await adjustWallet(guild.id, target.id, lost);
		await incrementCounters(guild.id, interaction.user.id, { robberyFailed: 1 });

		await send({
			title: `🚨 Your robbery of ${target.displayName} failed`,
			line:
				lost > 0 || plan.amount === 0
					? line(lost)
					: `${line(0)}\n-# Your wallet was already empty, so it cost you nothing.`,
			result:
				lost > 0
					? `−${formatNumber(lost)}${plan.rule.toTarget === true ? ` to ${target.displayName}` : ""}`
					: "Nothing lost",
			colour: lost > 0 ? theme.colours.error : theme.colours.warning,
			wallet: paid?.wallet ?? null,
		});
	},
});
