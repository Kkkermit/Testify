import { Events, type Message, type PartialMessage } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { truncate } from "@lib/format";
import { writeAuditLog } from "@lib/moderation";

/** Discord refuses an empty field, which is all a message of only an attachment or a sticker has. */
function shown(content: string | null): string {
	if (content === null) return "*Not cached.*";
	return content === "" ? "*No text.*" : truncate(content, 900);
}

export default defineEvent({
	name: Events.MessageUpdate,
	async run(client: TestifyClient, before: Message | PartialMessage, after: Message | PartialMessage) {
		if (!after.guild || after.author?.bot === true) return;
		if (before.content === after.content) return;

		await writeAuditLog(client, after.guild, {
			event: "messageUpdate",
			title: "Message edited",
			tone: "updated",
			fields: [
				{ name: "Author", value: after.author ? `${after.author}` : "Unknown", inline: true },
				{ name: "Channel", value: `<#${after.channelId}>`, inline: true },
				{ name: "Before", value: shown(before.content) },
				{ name: "After", value: shown(after.content) },
			],
		});
	},
});
