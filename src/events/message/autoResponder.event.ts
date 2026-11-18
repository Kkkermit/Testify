import { toError } from "@core/errors";
import { defineMessageHandler } from "@core/message";
import { listAutoResponders } from "@database/repositories/autoResponderRepository";
import { responderFor, shouldAnswer } from "@lib/autoResponders";

/** After the prefix commands, counting and the link filter, so a command, a count or a deleted link is never answered. */
export default defineMessageHandler({
	name: "autoResponder",
	order: 30,
	async run(message, client) {
		if (!message.inGuild() || message.system || message.content === "" || !message.channel.isSendable()) return;

		const responders = await listAutoResponders(message.guildId);
		if (responders.length === 0) return;

		const responder = responderFor(message.content, responders);
		if (responder === null || !shouldAnswer(message.guildId, message.channelId, responder.id)) return;

		await message
			.reply({ content: responder.reply, allowedMentions: { parse: [], repliedUser: false } })
			.catch((error: unknown) => {
				client.logger.debug(
					{ err: toError(error), guildId: message.guildId, channelId: message.channelId },
					"[AUTO_RESPONDER] Could not reply. The bot may not be allowed to post or read history there.",
				);
			});
	},
});
