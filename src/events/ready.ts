import { ActivityType, type Client, Events } from "discord.js";
import { INTERVALS } from "../config/constants";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";

export default defineEvent({
	name: Events.ClientReady,
	once: true,
	run(client, ready: Client<true>) {
		client.logger.info(
			{
				user: ready.user.tag,
				servers: ready.guilds.cache.size,
				commands: client.commands.size,
				buttons: client.buttons.size,
			},
			"Logged in",
		);

		ready.user.setStatus("online");
		rotatePresence(client, ready);
		client.timers.every("presence", INTERVALS.presenceRotationMs, () => rotatePresence(client, ready));
	},
});

function rotatePresence(client: TestifyClient, ready: Client<true>): void {
	const members = ready.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);

	const activities = [
		{ type: ActivityType.Watching, name: `${client.commands.size} commands` },
		{ type: ActivityType.Watching, name: `${ready.guilds.cache.size} servers` },
		{ type: ActivityType.Watching, name: `${members} members` },
		{ type: ActivityType.Listening, name: "/help" },
	] as const;

	const activity = activities[Math.floor(Math.random() * activities.length)];
	if (activity) ready.user.setPresence({ activities: [{ name: activity.name, type: activity.type }] });
}
