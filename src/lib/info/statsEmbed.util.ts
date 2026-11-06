import { cpus, freemem, totalmem } from "node:os";
import { type EmbedBuilder, version as djsVersion } from "discord.js";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { embed } from "@lib/discord/embeds.util";
import { formatBytes, formatNumber, formatUptime } from "@lib/format/format.util";

/** How big the bot is and how it is doing right now, as `/bot info` and the statistics message both show it. */
export function reachFields(client: TestifyClient): { name: string; value: string; inline: boolean }[] {
	const members = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);

	return [
		{ name: "Servers", value: formatNumber(client.guilds.cache.size), inline: true },
		{ name: "Members", value: formatNumber(members), inline: true },
		{ name: "Commands", value: formatNumber(client.commands.size), inline: true },
		{ name: "Uptime", value: formatUptime(client.startedAt), inline: true },
		{ name: "Latency", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
	];
}

/** Shared by the `/bot-stats-channel` command and the interval that refreshes it. */
export function botStatsEmbed(client: TestifyClient): EmbedBuilder {
	const usage = process.memoryUsage();

	return embed({
		category: "info",
		title: `${botName()} statistics`,
		fields: [
			...reachFields(client),
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
