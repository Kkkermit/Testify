import { Events } from "discord.js";
import { defineEvent } from "@core/event";
import { handleVoiceChange } from "@lib/tempVoice";

export default defineEvent({
	name: Events.VoiceStateUpdate,
	async run(client, before, after) {
		await handleVoiceChange(client, before, after);
	},
});
