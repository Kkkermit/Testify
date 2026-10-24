import { Events } from "discord.js";
import { defineEvent } from "@core/event";
import { handleStarChange } from "@lib/starboard";

export default defineEvent({
	name: Events.MessageReactionAdd,
	async run(client, reaction) {
		await handleStarChange(client, reaction);
	},
});
