import { type TestifyClient } from "@core/client";
import { listFixedStats, removeFixedStats } from "@database/repositories/settingsRepository";
import { botStatsEmbed } from "@lib/statsEmbed";

/** Refreshes every configured statistics message, pruning ones that have gone. */
export async function refreshBotStats(client: TestifyClient): Promise<void> {
	const entries = await listFixedStats();
	if (entries.length === 0) return;

	const rendered = botStatsEmbed(client);

	for (const entry of entries) {
		const channel = await client.channels.fetch(entry.channelId).catch(() => null);
		if (!channel?.isTextBased()) {
			await removeFixedStats(entry.guildId);
			continue;
		}

		const message = await channel.messages.fetch(entry.messageId).catch(() => null);
		if (!message) {
			await removeFixedStats(entry.guildId);
			continue;
		}

		await message.edit({ embeds: [rendered] }).catch(() => null);
	}
}
