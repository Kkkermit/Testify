import { theme } from "../../config/theme";
import { defineMessageHandler } from "../../core/message";
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

		await message.reply({
			embeds: [
				embed({
					category: "info",
					title: `Hello, I am ${client.user?.username ?? theme.name}`,
					description: "Use `/help` to see everything I can do.",
					thumbnail: client.user?.displayAvatarURL(),
				}),
			],
			components: [row(linkButton("Source code", theme.repository), linkButton("Support", theme.supportServer))],
		});

		return true;
	},
});
