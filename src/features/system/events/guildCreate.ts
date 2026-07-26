import { Events, type Guild } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { ensureGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { announceGuildChange } from "../services/guildLifecycle";

export default defineEvent({
	name: Events.GuildCreate,
	async execute(client: TestifyClient, guild: Guild) {
		// Seeding the default prefix here never actually ran before: the handler
		// declared `execute(guild, message)` against a payload that has no second
		// argument, so its first guard always returned.
		await ensureGuildSettings(guild.id);
		await announceGuildChange(client, guild, "joined");
	},
});
