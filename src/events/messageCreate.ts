import { Events, type Message } from "discord.js";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";

/**
 * The only `messageCreate` listener. Features contribute ordered processors
 * through the message pipeline rather than binding their own listeners.
 */
export default defineEvent({
	name: Events.MessageCreate,
	async execute(client: TestifyClient, message: Message) {
		if (message.system || message.webhookId !== null) return;
		await client.messages.run(client, message);
	},
});
