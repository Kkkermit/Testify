import { ActivityType, type PresenceStatusData } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type BotControlState, type GatewayState } from "@testify/shared";

/** Pausing and resuming the bot without ending the process the dashboard is served from. */

export function gatewayStateOf(client: TestifyClient): GatewayState {
	if (client.paused) return "paused";

	return client.isReady() ? "online" : "connecting";
}

export function controlState(client: TestifyClient): BotControlState {
	return {
		gateway: gatewayStateOf(client),
		since: client.pausedAt === null ? null : new Date(client.pausedAt).toISOString(),
		guilds: client.guilds.cache.size,
		// -1 is discord.js's "not measured yet", which is not a number worth showing.
		pingMs: client.isReady() && client.ws.ping >= 0 ? Math.round(client.ws.ping) : null,
	};
}

/**
 * Invisible rather than offline: a bot cannot appear offline while connected, and invisible is the closest
 * Discord has. The presence is cosmetic — the refusal in `runChecks` is what actually stops it working.
 */
export function pause(client: TestifyClient, now = Date.now()): BotControlState {
	client.paused = true;
	client.pausedAt = now;

	setPresence(client, "invisible", "paused from the dashboard");
	client.logger.warn("[CONTROL] Testify was paused from the dashboard. No commands will run until it is resumed.");

	return controlState(client);
}

export function resume(client: TestifyClient): BotControlState {
	client.paused = false;
	client.pausedAt = null;

	setPresence(client, "online", "/help");
	client.logger.info("[CONTROL] Testify was resumed from the dashboard.");

	return controlState(client);
}

/** Presence is a nicety, and a bot that cannot set it is still correctly paused. */
function setPresence(client: TestifyClient, status: PresenceStatusData, name: string): void {
	try {
		client.user?.setPresence({ status, activities: [{ name, type: ActivityType.Custom }] });
	} catch (error) {
		client.logger.debug({ err: toError(error) }, "[CONTROL] Could not set the presence");
	}
}
