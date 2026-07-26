import { DEFAULT_PREFIX } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { getGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { linkButton, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";

/**
 * The two original triggers were about 95% identical and both dereferenced
 * `message.guild.id` behind only a bot check, so any DM containing a mention or
 * the bot's name threw.
 */
export default defineMessageProcessor({
	name: "mentionReply",
	order: 5,
	async run(client, message) {
		const botId = client.user?.id;
		if (botId === undefined) return;

		const mentionsBot = new RegExp(`^<@!?${botId}>$`).test(message.content.trim());
		if (!mentionsBot) return;

		const prefix = message.guild ? (await getGuildSettings(message.guild.id)).prefix : DEFAULT_PREFIX;

		await message.reply({
			embeds: [
				embed({
					category: Category.Info,
					title: `Hello, I am ${client.user?.username ?? theme.brand.name}`,
					description: [
						`My prefix here is \`${prefix}\`.`,
						"",
						`Use \`/help\` or \`${prefix}help\` to see everything I can do.`,
					].join("\n"),
					thumbnail: client.user?.displayAvatarURL(),
				}),
			],
			components: [
				row(linkButton("Source code", theme.brand.repository), linkButton("Support", theme.brand.supportInvite)),
			],
		});

		return true;
	},
});
