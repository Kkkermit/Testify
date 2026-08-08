import { ChannelType, type DMChannel, Events, type GuildChannel } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { writeAuditLog } from "@lib/auditLog.util";

export default defineEvent({
	name: Events.ChannelDelete,
	async run(client: TestifyClient, channel: DMChannel | GuildChannel) {
		if (!("guild" in channel)) return;

		await writeAuditLog(client, channel.guild, {
			event: "channelDelete",
			title: "Channel deleted",
			colour: "Red",
			fields: [
				{ name: "Channel", value: `\`${channel.name}\``, inline: true },
				{ name: "Type", value: ChannelType[channel.type], inline: true },
			],
		});
	},
});
