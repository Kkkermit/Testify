import { Events, type Message, type PartialMessage } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { writeAuditLog } from "@lib/auditLog";
import { truncate } from "@lib/format";

export default defineEvent({
	name: Events.MessageUpdate,
	async run(client: TestifyClient, before: Message | PartialMessage, after: Message | PartialMessage) {
		if (!after.guild || after.author?.bot === true) return;
		if (before.content === after.content) return;

		await writeAuditLog(client, after.guild, {
			event: "messageUpdate",
			title: "Message edited",
			colour: "Yellow",
			fields: [
				{ name: "Author", value: after.author ? `${after.author}` : "Unknown", inline: true },
				{ name: "Channel", value: `<#${after.channelId}>`, inline: true },
				{ name: "Before", value: truncate(before.content ?? "*Not cached.*", 900) },
				{ name: "After", value: truncate(after.content ?? "*Not cached.*", 900) },
			],
		});
	},
});
