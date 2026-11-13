import { type Guild } from "discord.js";
import { type BotLanguage } from "@config/languages";
import { type ComponentInteraction } from "@core/button";
import { UserFacingError } from "@core/errors";
import { readerLanguage } from "@core/language";
import { requirePostable } from "@lib/discord/channels.util";

/** The channel a select menu picked, refusing one the bot cannot post in; null when there is nothing to do. */
export async function pickedChannelId(interaction: ComponentInteraction, guild: Guild): Promise<string | null> {
	if (!interaction.isChannelSelectMenu()) return null;

	const [channelId] = interaction.values;
	if (channelId === undefined) return null;

	await requireSendable(guild, channelId, readerLanguage(interaction));
	return channelId;
}

/** Worth re-checking on save as well as on pick: a channel can be deleted, or the bot's access to it taken, between the two. */
export async function requireSendable(guild: Guild, channelId: string, language: BotLanguage = "en"): Promise<void> {
	const channel = await guild.channels.fetch(channelId).catch(() => null);

	if (channel?.isSendable() !== true || !channel.isTextBased()) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}
	requirePostable(channel, language);
}
