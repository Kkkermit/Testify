import { ChannelType, Events, type DMChannel, type GuildChannel } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { writeAuditLog } from "../services/auditLog";

export default defineEvent({
	name: Events.ChannelDelete,
	async execute(client: TestifyClient, channel: DMChannel | GuildChannel) {
		if (!("guild" in channel)) return;

		await writeAuditLog(client, channel.guild, {
			event: "channelDelete",
			title: "Channel deleted",
			color: "Red",
			fields: [
				{ name: "Channel", value: `\`${channel.name}\``, inline: true },
				{ name: "Type", value: ChannelType[channel.type], inline: true },
			],
		});
	},
});
