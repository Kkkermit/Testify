import { defineMessageHandler } from "@core/message";
import { openConversationOf } from "@database/repositories/modmailRepository";
import { offerModmail, relayFromMember } from "@lib/modmail";

/** After the prefix commands, so a command typed in a direct message still runs rather than reaching staff. */
export default defineMessageHandler({
	name: "modmailDirect",
	order: 11,
	async run(message, client) {
		if (message.guild !== null) return;

		const conversation = await openConversationOf(message.author.id);
		if (conversation === null) {
			await offerModmail(client, message);
			return;
		}

		await relayFromMember(client, conversation, message);
		return true;
	},
});
