import { instanceConfig } from "@config/instance";
import { botName } from "@core/brand";
import { defineMessageHandler } from "@core/message";
import { getPrefix } from "@database/repositories/prefixRepository";
import { projectLinkButtons } from "@lib/bot";
import { embed, row } from "@lib/discord";

/** Replies when someone mentions the bot on its own, and nothing else. */
export default defineMessageHandler({
	name: "mentionReply",
	order: 5,
	async run(message, client) {
		const botId = client.user?.id;
		if (botId === undefined) return;
		if (!new RegExp(`^<@!?${botId}>$`).test(message.content.trim())) return;

		const prefix = message.guild === null ? instanceConfig().defaultPrefix : await getPrefix(message.guild.id);

		await message.reply({
			embeds: [
				embed({
					category: "info",
					title: `Hello, I am ${botName()}`,
					description: `My prefix here is \`${prefix}\`.\n\nUse \`/help\` or \`${prefix}help\` to see everything I can do.`,
					thumbnail: client.user?.displayAvatarURL(),
				}),
			],
			components: [row(...projectLinkButtons("Support"))],
		});

		return true;
	},
});
