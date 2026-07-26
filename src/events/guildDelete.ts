import { Events, type Guild } from "discord.js";
import { defineEvent } from "../core/event";
import { purgeGuild } from "../database/repositories/settingsRepository";
import { announceGuildChange } from "../lib/guildLifecycle";

export default defineEvent({
	name: Events.GuildDelete,
	async run(client, guild: Guild) {
		// Nothing is kept for a server the bot is no longer in.
		await purgeGuild(guild.id);
		await announceGuildChange(client, guild, "left");
	},
});
