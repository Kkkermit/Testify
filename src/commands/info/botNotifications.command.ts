import { defineCommand } from "@core/command";
import { reply } from "@lib/discord";
import { noticeBoard, readNoticeFeed } from "@lib/notices";

export default defineCommand({
	name: "bot-notifications",
	description: "Shows what the bot's owners want everybody to know, such as a feature being down.",
	category: "info",
	aliases: ["notifications", "notices"],
	private: true,

	async run(interaction, client) {
		const { notices } = await readNoticeFeed(interaction.user.id, { markRead: true });
		// The controls are drawn only for the bot's owners, and every press on them checks again.
		const ownerId = client.isOwner(interaction.user.id) ? interaction.user.id : null;

		await reply(interaction, noticeBoard(notices, ownerId));
	},
});
