import { defineCommand } from "@core/command";
import { reply } from "@lib/discord";
import { allNotices, noticeBoard, readNoticeFeed } from "@lib/notices";

export default defineCommand({
	name: "bot-notifications",
	description: "Shows what the bot's owners want everybody to know, such as a feature being down.",
	category: "info",
	aliases: ["notifications", "notices"],
	private: true,

	async run(interaction, client) {
		const { notices } = await readNoticeFeed(interaction.user.id, { markRead: true });
		// The controls, and the ones still waiting to go up, are only for the bot's owners; every press checks again.
		const ownerId = client.isOwner(interaction.user.id) ? interaction.user.id : null;

		await reply(interaction, noticeBoard(ownerId === null ? notices : await allNotices(), ownerId));
	},
});
