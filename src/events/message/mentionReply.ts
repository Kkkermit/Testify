import { DEFAULT_PREFIX } from "../../config/constants";
import { theme } from "../../config/theme";
import { defineMessageHandler } from "../../core/message";
import { getPrefix } from "../../database/repositories/settingsRepository";
import { linkButton, row } from "../../lib/components";
import { embed } from "../../lib/embeds";

/** Replies when someone mentions the bot on its own, and nothing else. */
export default defineMessageHandler({
	name: "mentionReply",
	order: 5,
	async run(message, client) {
		const botId = client.user?.id;
		if (botId === undefined) return;
		if (!new RegExp(`^<@!?${botId}>$`).test(message.content.trim())) return;

		const prefix = message.guild === null ? DEFAULT_PREFIX : await getPrefix(message.guild.id);

		await message.reply({
			embeds: [
				embed({
					category: "info",
					title: `Hello, I am ${client.user?.username ?? theme.name}`,
					description: `My prefix here is \`${prefix}\`.\n\nUse \`/help\` or \`${prefix}help\` to see everything I can do.`,
					thumbnail: client.user?.displayAvatarURL(),
				}),
			],
			components: [row(linkButton("Source code", theme.repository), linkButton("Support", theme.supportServer))],
		});

		return true;
	},
});
