import { theme } from "@config/theme";
import { defineMessageHandler } from "@core/message";
import { advanceCount, getCounting, resetCount } from "@database/repositories/settingsRepository";
import { embed, errorEmbed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";
import { replyTemporarily } from "@lib/tidyReply.util";

/**
 * The expected number and the "not twice in a row" rule are both enforced inside
 * the update filter, so two messages arriving together can no longer both count.
 */
export default defineMessageHandler({
	name: "counting",
	order: 20,
	async run(message, client) {
		if (!message.guild) return;

		const settings = await getCounting(message.guild.id);
		if (settings?.channelId !== message.channelId) return;

		const parsed = Number.parseInt(message.content.trim(), 10);
		if (Number.isNaN(parsed) || String(parsed) !== message.content.trim()) return;

		const expected = settings.count + 1;

		if (parsed !== expected) {
			await resetCount(message.guild.id);

			// Tidied away after a few seconds: a counting channel fills with corrections
			// otherwise, and the numbers become hard to find among them.
			await replyTemporarily(
				client,
				message,
				errorEmbed(
					`**${message.author.username}** broke the chain at **${formatNumber(settings.count)}**. The next number is **1**.`,
				),
			);
			return true;
		}

		const advanced = await advanceCount(message.guild.id, expected, message.author.id);
		if (!advanced) {
			await replyTemporarily(client, message, errorEmbed("You cannot count twice in a row."));
			return true;
		}

		await message.react(theme.emoji.counting).catch(() => null);

		if (advanced.count >= advanced.maxCount) {
			await resetCount(message.guild.id);
			if (message.channel.isSendable()) {
				await message.channel.send({
					embeds: [
						embed({
							category: "settings",
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
