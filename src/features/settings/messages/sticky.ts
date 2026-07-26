import { Category } from "../../../config/categories";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { bumpSticky, setStickyMessageId } from "../../../database/repositories/settingsRepository";
import { embed } from "../../../ui/embeds";

/**
 * The counter advance and the "time to repost" decision happen in one atomic
 * update. The previous handler did `await data.forEach(async …)`, which does not
 * await at all, so concurrent messages raced each other's writes.
 */
export default defineMessageProcessor({
	name: "stickyMessage",
	order: 60,
	async run(_client, message) {
		if (!message.guild || !message.channel.isSendable()) return;

		const due = await bumpSticky(message.guild.id, message.channelId);
		if (!due) return;

		if (due.lastMessageId !== null) {
			await message.channel.messages.delete(due.lastMessageId).catch(() => null);
		}

		const posted = await message.channel.send({
			embeds: [embed({ category: Category.Settings, title: "Sticky message", description: due.message })],
		});

		await setStickyMessageId(message.guild.id, message.channelId, posted.id);
	},
});
