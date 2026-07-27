import { cpus, freemem, totalmem } from "node:os";
import { type EmbedBuilder, version as djsVersion } from "discord.js";
import { type TestifyClient } from "@core/client";
import { embed } from "@lib/embeds.util";
import { formatBytes, formatNumber, formatUptime } from "@lib/format.util";

/** Shared by the `/bot-stats-channel` command and the interval that refreshes it. */
export function botStatsEmbed(client: TestifyClient): EmbedBuilder {
	const members = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
	const usage = process.memoryUsage();

	return embed({
		category: "info",
		title: `${client.user?.username ?? "Bot"} statistics`,
		fields: [
			{ name: "Servers", value: formatNumber(client.guilds.cache.size), inline: true },
			{ name: "Members", value: formatNumber(members), inline: true },
			{ name: "Commands", value: formatNumber(client.commands.size), inline: true },
			{ name: "Uptime", value: formatUptime(client.startedAt), inline: true },
			{ name: "Latency", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
			{ name: "Heap", value: formatBytes(usage.heapUsed), inline: true },
			{ name: "CPU", value: cpus()[0]?.model.trim() ?? "Unknown" },
			{ name: "Memory", value: `${formatBytes(totalmem() - freemem())} / ${formatBytes(totalmem())}`, inline: true },
			{ name: "Node", value: process.version, inline: true },
			{ name: "discord.js", value: `v${djsVersion}`, inline: true },
		],
		thumbnail: client.user?.displayAvatarURL(),
		footer: "Refreshes every five minutes",
	});
}
