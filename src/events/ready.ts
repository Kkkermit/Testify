import { ActivityType, Events, type Client } from "discord.js";
import { INTERVALS, DEFAULT_PREFIX } from "../config/constants";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";

/**
 * `once: true`, so a gateway re-identify cannot stack a second set of intervals —
 * which is exactly what five of the previous seven ready handlers did.
 */
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	execute(client: TestifyClient, ready: Client<true>) {
		client.logger.info(
			{
				user: ready.user.tag,
				guilds: ready.guilds.cache.size,
				commands: client.commands.size,
				components: client.components.size,
				processors: client.messages.size,
			},
			"Logged in",
		);

		ready.user.setStatus("online");
		rotatePresence(client, ready);
		client.timers.interval("presence", INTERVALS.presenceRotationMs, () => rotatePresence(client, ready));
	},
});

function rotatePresence(client: TestifyClient, ready: Client<true>): void {
	const members = ready.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);

	const activities = [
		{ type: ActivityType.Watching, name: `${client.commands.size} commands` },
		{ type: ActivityType.Watching, name: `${ready.guilds.cache.size} servers` },
		{ type: ActivityType.Watching, name: `${members} members` },
		{ type: ActivityType.Playing, name: `${DEFAULT_PREFIX}help | @${ready.user.username}` },
	] as const;

	const activity = activities[Math.floor(Math.random() * activities.length)];
	if (activity) ready.user.setPresence({ activities: [{ name: activity.name, type: activity.type }] });
}
