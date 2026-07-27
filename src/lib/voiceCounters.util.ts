import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { getVoiceCounter } from "@database/repositories/settingsRepository";
import { formatNumber } from "@lib/format.util";

/**
 * Four byte-identical event files (with `1`-suffixed variables) collapse into
 * this. Discord rate-limits channel renames to two per ten minutes, so failures
 * are logged rather than passed to `.catch(err)` where `err` was undefined —
 * which is to say, no handler at all.
 */
export async function syncVoiceCounters(client: TestifyClient, guild: Guild): Promise<void> {
	const settings = await getVoiceCounter(guild.id);
	if (!settings) return;

	const bots = guild.members.cache.filter((member) => member.user.bot).size;
	const humans = Math.max(0, guild.memberCount - bots);

	await Promise.all([
		rename(client, guild, settings.memberChannelId, `Members: ${formatNumber(humans)}`),
		rename(client, guild, settings.botChannelId, `Bots: ${formatNumber(bots)}`),
	]);
}

async function rename(client: TestifyClient, guild: Guild, channelId: string | null, name: string): Promise<void> {
	if (channelId === null) return;

	const channel = guild.channels.cache.get(channelId);
	if (!channel || channel.name === name) return;

	try {
		await channel.setName(name, "Voice counter update");
	} catch (error) {
		client.logger.debug(
			{ err: toError(error), guildId: guild.id, channelId },
			"Could not rename the counter channel, most likely rate limited",
		);
	}
}
