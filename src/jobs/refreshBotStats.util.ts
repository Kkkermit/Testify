import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { listFixedStats, removeFixedStats } from "@database/repositories/botStatsRepository";
import { botStatsEmbed } from "@lib/info";

const GONE: ReadonlySet<number> = new Set([RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.UnknownMessage]);

/** Discord saying the channel or message no longer exists, as opposed to a request that may work next time. */
function isGone(error: unknown): boolean {
	return error instanceof DiscordAPIError && typeof error.code === "number" && GONE.has(error.code);
}

/** Refreshes every configured statistics message, forgetting only the ones Discord says are gone. */
export async function refreshBotStats(client: TestifyClient): Promise<void> {
	const entries = await listFixedStats();
	if (entries.length === 0) return;

	const rendered = botStatsEmbed(client);

	for (const entry of entries) {
		try {
			const channel = await client.channels.fetch(entry.channelId);
			if (!channel?.isTextBased()) {
				await removeFixedStats(entry.guildId);
				continue;
			}

			const message = await channel.messages.fetch(entry.messageId);
			await message.edit({ embeds: [rendered] });
		} catch (error) {
			if (isGone(error)) {
				await removeFixedStats(entry.guildId);
				continue;
			}
			client.logger.debug(
				{ err: toError(error), guildId: entry.guildId },
				"[BOT_STATS] Could not refresh a statistics message; it is tried again on the next run.",
			);
		}
	}
}
