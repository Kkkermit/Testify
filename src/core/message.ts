import { type Message } from "discord.js";
import { type TestifyClient } from "@core/client";

/** Runs on every message. */
export interface MessageHandler {
	name: string;
	/** Lower numbers run first. */
	order?: number;
	/** Set this to also see messages from bots. */
	allowBots?: boolean;
	/** Return true to stop the handlers after this one from running. */
	run(message: Message, client: TestifyClient): Promise<boolean | void>;
}

export const MESSAGE_HANDLER = Symbol.for("testify.messageHandler");

export function defineMessageHandler(handler: MessageHandler): MessageHandler {
	return Object.defineProperty(handler, MESSAGE_HANDLER, { value: true, enumerable: false });
}

export async function runMessageHandlers(message: Message, client: TestifyClient): Promise<void> {
	// Paused means paused: no XP, no counting, no automod, no prefix commands.
	if (client.paused) return;

	for (const handler of client.messageHandlers) {
		if (message.author.bot && !handler.allowBots) continue;

		try {
			if ((await handler.run(message, client)) === true) return;
		} catch (error) {
			client.logger.error({ err: error, handler: handler.name }, "Message handler failed");
		}
	}
}
