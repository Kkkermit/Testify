import { Events, type Guild } from "discord.js";
import { defineEvent } from "../core/event";
import { announceGuildChange } from "../lib/guildLifecycle";

export default defineEvent({
	name: Events.GuildCreate,
	async run(client, guild: Guild) {
		await announceGuildChange(client, guild, "joined");
	},
});
