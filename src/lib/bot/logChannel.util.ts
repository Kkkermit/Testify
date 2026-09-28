import { type MessageCreateOptions } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";

/** Posts to one of the operator's log channels, answering whether the post landed. */
export async function postToLogChannel(
	client: TestifyClient,
	channelId: string,
	payload: MessageCreateOptions,
): Promise<boolean> {
	try {
		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || !channel.isSendable()) return false;

		await channel.send(payload);
		return true;
	} catch (error) {
		client.logger.warn(
			{ err: toError(error), channelId },
			"[LOG_CHANNEL] Could not post to a log channel. Check the ID and that the bot can send messages there.",
		);
		return false;
	}
}
