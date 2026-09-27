import { defineMessageHandler } from "@core/message";
import { activity } from "@lib/info";

/** Counts a message towards the server's insights; the text itself is never read or kept. */
export default defineMessageHandler({
	name: "activity",
	// First, because a prefix command stops the handlers after it and is still somebody talking.
	order: 0,
	run(message) {
		if (message.guildId === null) return Promise.resolve();

		activity.count({ guildId: message.guildId, channelId: message.channelId, userId: message.author.id });
		return Promise.resolve();
	},
});
