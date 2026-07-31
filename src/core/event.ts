import { type ClientEvents } from "discord.js";
import { type TestifyClient } from "@core/client";

/** Handles a Discord gateway event. */
export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
	name: K;
	/** Run only the first time the event fires. */
	once?: boolean;
	run(client: TestifyClient, ...args: ClientEvents[K]): Promise<void> | void;
}

export function defineEvent<K extends keyof ClientEvents>(event: Event<K>): Event<K> {
	return event;
}

export type AnyEvent = Event<keyof ClientEvents>;
