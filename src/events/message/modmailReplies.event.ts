import { defineMessageHandler } from "@core/message";
import { conversationByThread, getModmailSettings } from "@database/repositories/modmailRepository";
import { relayFromStaff } from "@lib/modmail";

/** After the prefix commands, so a command run in the thread is not sent on to the member. */
export default defineMessageHandler({
	name: "modmailReplies",
	order: 15,
	async run(message, client) {
		if (!message.inGuild() || !message.channel.isThread()) return;

		const settings = await getModmailSettings(message.guild.id);
		if (settings === null) return;
		if (message.channel.parentId !== settings.channelId) return;

		const conversation = await conversationByThread(message.channel.id);
		if (conversation === null) return;

		await relayFromStaff(client, conversation, message, settings);
	},
});
