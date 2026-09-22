import { Events, type Message, type PartialMessage } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { truncate } from "@lib/format";
import { writeAuditLog } from "@lib/moderation";

export default defineEvent({
	name: Events.MessageDelete,
	async run(client: TestifyClient, message: Message | PartialMessage) {
		if (!message.guild || message.author?.bot === true) return;

		await writeAuditLog(client, message.guild, {
			event: "messageDelete",
			title: "Message deleted",
			tone: "deleted",
			fields: [
				{ name: "Author", value: message.author ? `${message.author}` : "Unknown", inline: true },
				{ name: "Channel", value: `<#${message.channelId}>`, inline: true },
				{ name: "Content", value: truncate(message.content ?? "*Not cached.*", 1_000) },
			],
		});
	},
});
