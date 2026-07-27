import { type Message } from "discord.js";
import { type TestifyClient } from "@core/client";

/**
 * Runs on every message. Levelling, counting, anti-link and the rest are all
 * message handlers, so there is still only one `messageCreate` listener.
 */
export interface MessageHandler {
	name: string;
	/** Lower numbers run first. Defaults to 100. */
	order?: number;
	/** Set this to also see messages from bots. */
	allowBots?: boolean;
	/** Return true to stop the handlers after this one from running. */
	run(message: Message, client: TestifyClient): Promise<boolean | void>;
}

/**
 * Marks a module as a message handler.
 *
 * A handler and a gateway event are both `{ name, run }`, so without this the
 * loader cannot tell them apart — and a stray copy of `events/message/` (the
 * ` 2` directories cloud sync and editors leave behind) gets registered as eight
 * gateway events named `levelling`, `counting` and so on, which Discord never
 * emits. The bot boots, the banner counts them, and nothing runs.
 */
export const MESSAGE_HANDLER = Symbol.for("testify.messageHandler");

export function defineMessageHandler(handler: MessageHandler): MessageHandler {
	return Object.defineProperty(handler, MESSAGE_HANDLER, { value: true, enumerable: false });
}

export async function runMessageHandlers(message: Message, client: TestifyClient): Promise<void> {
	for (const handler of client.messageHandlers) {
		if (message.author.bot && !handler.allowBots) continue;

		try {
			if ((await handler.run(message, client)) === true) return;
		} catch (error) {
			client.logger.error({ err: error, handler: handler.name }, "Message handler failed");
		}
	}
}
