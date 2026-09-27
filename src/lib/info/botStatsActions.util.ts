import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { type FixedStatsMessage } from "@database/models/guildSettings.schema";
import { getFixedStats, removeFixedStats, setFixedStats } from "@database/repositories/settingsRepository";
import { botStatsEmbed } from "@lib/info/statsEmbed.util";
import { type BotStatsSettings } from "@testify/shared";

/** Where the statistics message lives, shared by `/bot-stats-channel` and the dashboard. */

export async function readBotStats(guildId: string): Promise<BotStatsSettings> {
	return { channelId: (await getFixedStats(guildId))?.channelId ?? null };
}

async function takeDown(client: TestifyClient, posted: FixedStatsMessage): Promise<void> {
	const channel = await client.channels.fetch(posted.channelId).catch(() => null);
	if (channel?.isTextBased() === true) await channel.messages.delete(posted.messageId).catch(() => null);
}

/** Posts the new message before removing the old one, so a refused send leaves the server with the one it had. */
export async function postBotStats(
	client: TestifyClient,
	guild: Guild,
	channelId: string,
	userId: string,
): Promise<BotStatsSettings> {
	// A guild's channel manager refuses an id belonging to another server.
	const channel = await guild.channels.fetch(channelId).catch(() => null);
	if (channel?.isTextBased() !== true || !channel.isSendable()) {
		throw new UserFacingError("Pick a text channel I can send messages in.");
	}

	const previous = await getFixedStats(guild.id);
	const message = await channel.send({ embeds: [botStatsEmbed(client)] });
	await setFixedStats(guild.id, channel.id, message.id, userId);

	if (previous !== null && previous.messageId !== message.id) await takeDown(client, previous);

	return { channelId: channel.id };
}

/** False when nothing was posted, so each surface can say so in its own words. */
export async function removeBotStats(client: TestifyClient, guildId: string): Promise<boolean> {
	const posted = await getFixedStats(guildId);
	if (posted === null) return false;

	await takeDown(client, posted);
	await removeFixedStats(guildId);

	return true;
}
