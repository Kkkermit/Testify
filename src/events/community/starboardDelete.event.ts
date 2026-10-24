import { Events } from "discord.js";
import { defineEvent } from "@core/event";
import { handleStarredDelete } from "@lib/starboard";

/** Covers both directions: an original deleted, and a repost deleted from the board. */
export default defineEvent({
	name: Events.MessageDelete,
	async run(_client, message) {
		if (message.guild === null) return;
		await handleStarredDelete(message.guild, message.id);
	},
});
