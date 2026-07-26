import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { encodeId, Namespace } from "../../../core/customId";
import { logDirectMessage } from "../../../database/repositories/integrationRepository";
import { button, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";
import { discordTime, truncate } from "../../../ui/format";

export default defineMessageProcessor({
	name: "directMessageLog",
	order: 1,
	async run(client, message) {
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
					category: Category.Info,
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
						id: encodeId(Namespace.UserInfo, "info", message.author.id, message.author.id),
						label: "User info",
						style: ButtonStyle.Primary,
					}),
					button({
						id: encodeId(Namespace.Profile, "reply", message.author.id),
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
