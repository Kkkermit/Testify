import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { advanceCount, getCounting, resetCount } from "../../../database/repositories/settingsRepository";
import { embed, errorEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

/**
 * The expected number and the "not twice in a row" rule are both enforced inside
 * the update filter, so two messages arriving together can no longer both count.
 */
export default defineMessageProcessor({
	name: "counting",
	order: 20,
	async run(_client, message) {
		if (!message.guild) return;

		const settings = await getCounting(message.guild.id);
		if (settings?.channelId !== message.channelId) return;

		const parsed = Number.parseInt(message.content.trim(), 10);
		if (Number.isNaN(parsed) || String(parsed) !== message.content.trim()) return;

		const expected = settings.count + 1;

		if (parsed !== expected) {
			await resetCount(message.guild.id);
			await message.reply({
				embeds: [
					errorEmbed(
						`**${message.author.username}** broke the chain at **${formatNumber(settings.count)}**. The next number is **1**.`,
					),
				],
			});
			return true;
		}

		const advanced = await advanceCount(message.guild.id, expected, message.author.id);
		if (!advanced) {
			await message.reply({ embeds: [errorEmbed("You cannot count twice in a row.")] });
			return true;
		}

		await message.react(theme.emoji.counting).catch(() => null);

		if (advanced.count >= advanced.maxCount) {
			await resetCount(message.guild.id);
			if (message.channel.isSendable()) {
				await message.channel.send({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Goal reached",
							description: `**${message.author.username}** counted all the way to **${formatNumber(advanced.maxCount)}**. The counter has been reset.`,
						}),
					],
				});
			}
		}

		return true;
	},
});
