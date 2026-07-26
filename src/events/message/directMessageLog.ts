import { ButtonStyle } from "discord.js";
import { customId } from "../../core/button";
import { defineMessageHandler } from "../../core/message";
import { logDirectMessage } from "../../database/repositories/profileRepository";
import { button, row } from "../../lib/components";
import { embed } from "../../lib/embeds";
import { discordTime, truncate } from "../../lib/format";

export default defineMessageHandler({
	name: "directMessageLog",
	order: 1,
	async run(message, client) {
		if (message.guild !== null) return;

		const channelId = client.env.CHANNEL_DM_LOG;
		if (channelId === undefined) return;

		const channel = await client.channels.fetch(channelId).catch(() => null);
		if (!channel?.isTextBased() || !channel.isSendable()) return;

		const attachments = [...message.attachments.values()];
		const image = attachments.find((attachment) => attachment.contentType?.startsWith("image/") === true);

		const posted = await channel.send({
			embeds: [
				embed({
					category: "info",
					title: "Direct message received",
					description: truncate(message.content || "*No text content.*", 2_000),
					fields: [
						{ name: "From", value: `${message.author} (\`${message.author.id}\`)`, inline: true },
						{ name: "Sent", value: discordTime(message.createdAt, "F"), inline: true },
						...(attachments.length > 0
							? [
									{
										name: `Attachments (${attachments.length})`,
										value: attachments.map((file, index) => `[${index + 1}](${file.url})`).join(" \u00b7 "),
									},
								]
							: []),
					],
					footerIcon: message.author.displayAvatarURL(),
					...(image !== undefined ? { image: image.url } : {}),
				}),
			],
			components: [
				row(
					button({
						id: customId("userinfo", "info", message.author.id, message.author.id),
						label: "User info",
						style: ButtonStyle.Primary,
					}),
					button({
						id: customId("profile", "reply", message.author.id),
						label: "Reply",
						style: ButtonStyle.Success,
					}),
				),
			],
		});

		await logDirectMessage({
			messageId: posted.id,
			authorId: message.author.id,
			content: message.content,
			attachmentUrls: attachments.map((file) => file.url),
		});
	},
});
