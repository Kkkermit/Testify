import { arch, type as osType, cpus, freemem, platform, totalmem } from "node:os";
import { type ChatInputCommandInteraction, version as djsVersion } from "discord.js";
import { theme } from "../../config/theme";
import { type TestifyClient } from "../../core/client";
import { defineCommand } from "../../core/command";
import { linkButton, row } from "../../lib/components";
import { embed } from "../../lib/embeds";
import { discordTime, formatBytes, formatNumber, formatUptime } from "../../lib/format";
import { reply } from "../../lib/reply";

async function showUptime(interaction: ChatInputCommandInteraction, client: TestifyClient): Promise<void> {
	await reply(interaction, {
		embeds: [
			embed({
				category: "info",
				title: "Uptime",
				description: [
					`**Process** ${formatUptime(client.startedAt)}`,
					`**Gateway** ${client.uptime === null ? "not connected" : formatUptime(Date.now() - client.uptime)}`,
					`**Started** ${discordTime(client.startedAt, "R")}`,
				].join("\n"),
			}),
		],
	});
}

async function showSpecs(interaction: ChatInputCommandInteraction, client: TestifyClient): Promise<void> {
	const usage = process.memoryUsage();
	const cpu = cpus()[0];

	await reply(interaction, {
		embeds: [
			embed({
				category: "info",
				title: "Hardware and runtime",
				fields: [
					{ name: "Platform", value: `${osType()} (${platform()} ${arch()})`, inline: true },
					{ name: "CPU", value: cpu?.model.trim() ?? "Unknown", inline: true },
					{ name: "Cores", value: String(cpus().length), inline: true },
					{ name: "Heap used", value: formatBytes(usage.heapUsed), inline: true },
					{ name: "RSS", value: formatBytes(usage.rss), inline: true },
					{
						name: "System memory",
						value: `${formatBytes(totalmem() - freemem())} / ${formatBytes(totalmem())}`,
						inline: true,
					},
					{ name: "Node", value: process.version, inline: true },
					{ name: "discord.js", value: `v${djsVersion}`, inline: true },
					{ name: "Latency", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
				],
			}),
		],
	});
}

async function showInfo(interaction: ChatInputCommandInteraction, client: TestifyClient): Promise<void> {
	const members = client.guilds.cache.reduce(
		(total: number, guild: { memberCount: number }) => total + guild.memberCount,
		0,
	);

	await reply(interaction, {
		embeds: [
			embed({
				category: "info",
				title: `About ${theme.name}`,
				description: "An open source, multipurpose Discord bot written in TypeScript.",
				fields: [
					{ name: "Servers", value: formatNumber(client.guilds.cache.size), inline: true },
					{ name: "Members", value: formatNumber(members), inline: true },
					{ name: "Commands", value: formatNumber(client.commands.size), inline: true },
					{ name: "Uptime", value: formatUptime(client.startedAt), inline: true },
					{ name: "Latency", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
					{ name: "Developer", value: theme.author, inline: true },
				],
				thumbnail: client.user?.displayAvatarURL(),
			}),
		],
		components: [row(linkButton("Source code", theme.repository), linkButton("Support server", theme.supportServer))],
	});
}

export default defineCommand({
	name: "bot",
	description: "Information about the bot itself.",
	category: "info",
	subcommands: [
		{ name: "info", description: "General information about the bot.", run: showInfo },
		{ name: "uptime", description: "How long the bot has been running.", run: showUptime },
		{ name: "specs", description: "Hardware and runtime details.", run: showSpecs },
	],
});
