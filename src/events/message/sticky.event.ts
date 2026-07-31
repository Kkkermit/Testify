import { defineMessageHandler } from "@core/message";
import { bumpSticky, setStickyMessageId } from "@database/repositories/settingsRepository";
import { embed } from "@lib/embeds.util";

/** The counter advance and the "time to repost" decision happen in one atomic update. */
export default defineMessageHandler({
	name: "stickyMessage",
	order: 60,
	async run(message, _client) {
		if (!message.guild || !message.channel.isSendable()) return;

		const due = await bumpSticky(message.guild.id, message.channelId);
		if (!due) return;

		if (due.lastMessageId !== null) {
			await message.channel.messages.delete(due.lastMessageId).catch(() => null);
		}

		const posted = await message.channel.send({
			embeds: [embed({ category: "settings", title: "Sticky message", description: due.message })],
		});

		await setStickyMessageId(message.guild.id, message.channelId, posted.id);
	},
});
