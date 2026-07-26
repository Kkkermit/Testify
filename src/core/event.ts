import { type ClientEvents } from "discord.js";
import { type TestifyClient } from "./client";

/**
 * `client` comes first, which makes the payload spread type-safe. The previous
 * loader appended it last, producing a different arity per event type — and three
 * handlers whose signature was wrong enough that they never ran at all.
 */
export interface EventHandler<K extends keyof ClientEvents = keyof ClientEvents> {
	name: K;
	once?: boolean;
	execute(client: TestifyClient, ...args: ClientEvents[K]): Promise<void> | void;
}

export function defineEvent<K extends keyof ClientEvents>(handler: EventHandler<K>): EventHandler<K> {
	return handler;
}

export type AnyEventHandler = EventHandler<keyof ClientEvents>;
