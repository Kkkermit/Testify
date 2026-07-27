import { Events, type Message } from "discord.js";
import { defineEvent } from "@core/event";
import { runMessageHandlers } from "@core/message";

/**
 * The only `messageCreate` listener. Levelling, counting, anti-link and the rest
 * are message handlers in `events/message/`, so nothing else binds here.
 */
let warnedAboutContent = false;

export default defineEvent({
	name: Events.MessageCreate,
	async run(client, message: Message) {
		if (message.system || message.webhookId !== null) return;

		// Without the Message Content intent every message arrives blank, so nothing
		// matches a prefix and the bot looks broken with no error to go on.
		if (!warnedAboutContent && message.content === "" && message.attachments.size === 0 && !message.author.bot) {
			warnedAboutContent = true;
			client.logger.warn(
				"Messages are arriving with no text. Turn on the Message Content intent: " +
					"Discord Developer Portal → your app → Bot → Privileged Gateway Intents. " +
					"Prefix commands cannot work until you do.",
			);
		}

		await runMessageHandlers(message, client);
	},
});
