import { Events, type Guild } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { invalidateGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { announceGuildChange } from "../services/guildLifecycle";

export default defineEvent({
	name: Events.GuildDelete,
	async execute(client: TestifyClient, guild: Guild) {
		invalidateGuildSettings(guild.id);
		await announceGuildChange(client, guild, "left");
	},
});
