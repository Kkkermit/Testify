import { defineMessageHandler } from "@core/message";
import { logDirectMessage } from "@database/repositories/profileRepository";
import { dmLogMessage, loggedUser } from "@lib/bot";

export default defineMessageHandler({
	name: "directMessageLog",
	order: 1,
	async run(message, client) {
		if (message.guild !== null) return;

		const channelId = client.env.CHANNEL_DM_LOG;
		if (channelId === undefined) return;

		const channel = await client.channels.fetch(channelId).catch(() => null);
		if (!channel?.isTextBased() || !channel.isSendable()) return;

		const attachmentUrls = [...message.attachments.values()].map((file) => file.url);
		const posted = await channel.send(
			dmLogMessage(loggedUser(message.author), {
				content: message.content,
				sentAt: message.createdAt,
				attachmentUrls,
			}),
		);

		await logDirectMessage({
			messageId: posted.id,
			authorId: message.author.id,
			content: message.content,
			attachmentUrls,
		});
	},
});
