import { type ClientEvents } from "discord.js";
import { type TestifyClient } from "./client";

/**
 * Handles a Discord gateway event. The client comes first so the payload after
 * it is correctly typed for whichever event you named.
 */
export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
	name: K;
	/** Run only the first time the event fires. Use this for start-up work. */
	once?: boolean;
	run(client: TestifyClient, ...args: ClientEvents[K]): Promise<void> | void;
}

export function defineEvent<K extends keyof ClientEvents>(event: Event<K>): Event<K> {
	return event;
}

export type AnyEvent = Event<keyof ClientEvents>;
