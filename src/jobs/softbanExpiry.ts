import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { claimExpiredSoftban } from "@database/repositories/moderationRepository";

/**
 * Each expired softban is claimed atomically, so two ticks cannot both try to
 * unban the same user. The previous version used self-rescheduling `setTimeout`
 * recursion, which could not be cancelled at all.
 */
export async function processExpiredSoftbans(client: TestifyClient): Promise<void> {
	for (let processed = 0; processed < 25; processed += 1) {
		const softban = await claimExpiredSoftban();
		if (!softban) return;

		const guild = client.guilds.cache.get(softban.guildId);
		if (!guild) continue;

		try {
			await guild.bans.remove(softban.userId, `Softban expired. Original reason: ${softban.reason}`);
			client.logger.info({ guildId: softban.guildId, userId: softban.userId }, "Softban expired and was lifted");
		} catch (error) {
			// 10026 is "unknown ban" — already unbanned, which is not a failure.
			const code = (error as { code?: number }).code;
			if (code !== 10_026) {
				client.logger.warn(
					{ err: toError(error), guildId: softban.guildId, userId: softban.userId },
					"Could not lift an expired softban",
				);
			}
		}
	}
}
