import { arch, cpus, freemem, platform, totalmem, type as osType } from "node:os";
import { version as djsVersion } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { type CommandContext } from "../../../core/context";
import { linkButton, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";
import { discordTime, formatBytes, formatNumber, formatUptime } from "../../../ui/format";

async function showUptime(ctx: CommandContext): Promise<void> {
	await ctx.reply({
		embeds: [
			embed({
				category: Category.Info,
				title: "Uptime",
				description: [
					`**Process** ${formatUptime(ctx.client.startedAt)}`,
					`**Gateway** ${ctx.client.uptime === null ? "not connected" : formatUptime(Date.now() - ctx.client.uptime)}`,
					`**Started** ${discordTime(ctx.client.startedAt, "R")}`,
				].join("\n"),
			}),
		],
	});
}

async function showSpecs(ctx: CommandContext): Promise<void> {
	const usage = process.memoryUsage();
	const cpu = cpus()[0];

	await ctx.reply({
		embeds: [
			embed({
				category: Category.Info,
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
					{ name: "Latency", value: `${Math.max(0, Math.round(ctx.client.ws.ping))}ms`, inline: true },
				],
			}),
		],
	});
}

async function showInfo(ctx: CommandContext): Promise<void> {
	const members = ctx.client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);

	await ctx.reply({
		embeds: [
			embed({
				category: Category.Info,
				title: `About ${theme.brand.name}`,
				description: "An open source, multipurpose Discord bot written in TypeScript.",
				fields: [
					{ name: "Servers", value: formatNumber(ctx.client.guilds.cache.size), inline: true },
					{ name: "Members", value: formatNumber(members), inline: true },
					{ name: "Commands", value: formatNumber(ctx.client.commands.size), inline: true },
					{ name: "Uptime", value: formatUptime(ctx.client.startedAt), inline: true },
					{ name: "Latency", value: `${Math.max(0, Math.round(ctx.client.ws.ping))}ms`, inline: true },
					{ name: "Developer", value: theme.brand.developer, inline: true },
				],
				thumbnail: ctx.client.user?.displayAvatarURL(),
			}),
		],
		components: [
			row(linkButton("Source code", theme.brand.repository), linkButton("Support server", theme.brand.supportInvite)),
		],
	});
}

export default defineCommand({
	name: "bot",
	description: "Information about the bot itself.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["botinfo", "about", "uptime"],
	subcommands: [
		{ name: "info", description: "General information about the bot.", execute: showInfo },
		{ name: "uptime", description: "How long the bot has been running.", execute: showUptime },
		{ name: "specs", description: "Hardware and runtime details.", execute: showSpecs },
	],

	async execute(ctx) {
		const sub = ctx.options.getSubcommand();
		if (sub === "uptime") await showUptime(ctx);
		else if (sub === "specs") await showSpecs(ctx);
		else await showInfo(ctx);
	},
});
