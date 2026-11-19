import { Events, type Guild } from "discord.js";
import { defineEvent } from "@core/event";
import { announceGuildChange, greetInviter } from "@lib/bot";

export default defineEvent({
	name: Events.GuildCreate,
	async run(client, guild: Guild) {
		// Neither waits on the other: the log post and the getting-started message are separate jobs.
		await Promise.all([announceGuildChange(client, guild, "joined"), greetInviter(client, guild)]);
	},
});
