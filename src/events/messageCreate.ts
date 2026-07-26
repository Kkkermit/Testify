import { Events, type Message } from "discord.js";
import { defineEvent } from "../core/event";
import { runMessageHandlers } from "../core/message";

/**
 * The only `messageCreate` listener. Levelling, counting, anti-link and the rest
 * are message handlers in `events/message/`, so nothing else binds here.
 */
export default defineEvent({
	name: Events.MessageCreate,
	async run(client, message: Message) {
		if (message.system || message.webhookId !== null) return;
		await runMessageHandlers(message, client);
	},
});
