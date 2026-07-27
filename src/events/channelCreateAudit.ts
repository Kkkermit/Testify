import { ChannelType, Events, type NonThreadGuildBasedChannel } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { writeAuditLog } from "@lib/auditLog";

export default defineEvent({
	name: Events.ChannelCreate,
	async run(client: TestifyClient, channel: NonThreadGuildBasedChannel) {
		await writeAuditLog(client, channel.guild, {
			event: "channelCreate",
			title: "Channel created",
			colour: "Green",
			fields: [
				{ name: "Channel", value: `${channel} (\`${channel.name}\`)`, inline: true },
				{ name: "Type", value: ChannelType[channel.type], inline: true },
			],
		});
	},
});
