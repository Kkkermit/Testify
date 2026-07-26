import { type TestifyClient } from "../core/client";
import { attachGiveawaysManager } from "./giveaways";
import { attachMusicClient } from "./music";

/**
 * Wires the third-party clients that need the Discord client before login.
 * Everything else — polling jobs, schedulers — starts from a `ClientReady`
 * handler so it can register its timers with the timer registry.
 */
export function startIntegrations(client: TestifyClient): void {
	attachMusicClient(client);
	attachGiveawaysManager(client);
	client.logger.debug("Integrations attached");
}
