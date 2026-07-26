import { type Message } from "discord.js";
import { type TestifyClient } from "./client";
import { toError } from "./errors";
import { type Logger } from "./logger";

/**
 * Features that need to see every message register a processor instead of adding
 * another `messageCreate` listener. The previous code had ten concurrent
 * listeners with no ordering guarantees and no way to stop later work once a
 * message had been handled.
 */
export interface MessageProcessor {
	name: string;
	/** Lower runs first. Processors with the same order run in filename order. */
	order?: number;
	/** Set when the processor should also see the bot's own messages. */
	allowBots?: boolean;
	/** Return true to stop the rest of the pipeline. */
	run(client: TestifyClient, message: Message): Promise<boolean | void>;
}

export function defineMessageProcessor(processor: MessageProcessor): MessageProcessor {
	return processor;
}

export class MessagePipeline {
	private readonly processors: MessageProcessor[] = [];

	constructor(private readonly logger: Logger) {}

	register(processor: MessageProcessor): void {
		this.processors.push(processor);
		this.processors.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
	}

	get size(): number {
		return this.processors.length;
	}

	names(): string[] {
		return this.processors.map((processor) => processor.name);
	}

	async run(client: TestifyClient, message: Message): Promise<void> {
		for (const processor of this.processors) {
			if (message.author.bot && processor.allowBots !== true) continue;

			try {
				if ((await processor.run(client, message)) === true) return;
			} catch (error) {
				this.logger.error(
					{ err: toError(error), processor: processor.name, guildId: message.guildId },
					"Message processor failed",
				);
			}
		}
	}
}
