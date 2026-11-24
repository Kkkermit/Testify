import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { claimExpiredSoftban, retrySoftbanAt } from "@database/repositories/moderationRepository";

const PER_RUN = 25;

/** How long an unban Discord refused waits before the next try, so a missing permission is not retried every minute. */
const RETRY_AFTER_MS = 10 * MINUTE_MS;

export async function processExpiredSoftbans(client: TestifyClient): Promise<void> {
	for (let processed = 0; processed < PER_RUN; processed += 1) {
		const softban = await claimExpiredSoftban();
		if (!softban) return;

		const guild = client.guilds.cache.get(softban.guildId);
		if (!guild) continue;

		try {
			await guild.bans.remove(softban.userId, `Softban expired. Original reason: ${softban.reason}`);
			client.logger.info(
				{ guildId: softban.guildId, userId: softban.userId },
				"[SOFTBAN] A softban expired and was lifted.",
			);
		} catch (error) {
			// Already unbanned, which is not a failure.
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownBan) continue;

			await retrySoftbanAt(softban, new Date(Date.now() + RETRY_AFTER_MS));
			client.logger.warn(
				{ err: toError(error), guildId: softban.guildId, userId: softban.userId },
				"[SOFTBAN_ERROR] Could not lift an expired softban. Check the bot has Ban Members there; it is tried again in ten minutes.",
			);
		}
	}
}
