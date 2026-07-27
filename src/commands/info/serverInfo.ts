import { ChannelType, GuildExplicitContentFilter, GuildNSFWLevel, GuildVerificationLevel } from "discord.js";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds";
import { discordTime, formatNumber, titleCase, truncate } from "@lib/format";
import { reply } from "@lib/reply";

const TEXT_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];
const VOICE_TYPES = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];
const THREAD_TYPES = [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread];

export default defineCommand({
	name: "server-info",
	description: "Displays information about this server.",
	category: "info",
	aliases: ["server", "guildinfo"],
	guildOnly: true,

	async run(interaction) {
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError("This command only works inside a server.");

		await interaction.deferReply();
		await guild.members.fetch().catch(() => null);

		const bots = guild.members.cache.filter((member) => member.user.bot).size;
		const humans = guild.memberCount - bots;

		const count = (types: ChannelType[]): number =>
			guild.channels.cache.filter((channel) => types.includes(channel.type)).size;

		const roles = guild.roles.cache.filter((role) => role.name !== "@everyone").sort((a, b) => b.position - a.position);

		const builder = embed({
			category: "info",
			title: `${guild.name}`,
			description: guild.description ?? "No description set.",
			fields: [
				{
					name: "General",
					value: [
						`📜 **Created** ${discordTime(guild.createdAt, "R")}`,
						`💳 **ID** ${guild.id}`,
						`👑 **Owner** <@${guild.ownerId}>`,
						`🌍 **Language** ${localeName(guild.preferredLocale)}`,
						`💻 **Vanity URL** ${guild.vanityURLCode ?? "None"}`,
					].join("\n"),
				},
				{
					name: "Security",
					value: [
						`👀 **Explicit filter** ${titleCase(GuildExplicitContentFilter[guild.explicitContentFilter])}`,
						`🔞 **NSFW level** ${titleCase(GuildNSFWLevel[guild.nsfwLevel])}`,
						`🔒 **Verification** ${titleCase(GuildVerificationLevel[guild.verificationLevel])}`,
					].join("\n"),
					inline: true,
				},
				{
					name: `Members (${formatNumber(guild.memberCount)})`,
					value: [`👥 **People** ${formatNumber(humans)}`, `🤖 **Bots** ${formatNumber(bots)}`].join("\n"),
					inline: true,
				},
				{
					name: "Boosts",
					value: [`📈 **Tier** ${guild.premiumTier}`, `💎 **Boosts** ${guild.premiumSubscriptionCount ?? 0}`].join(
						"\n",
					),
					inline: true,
				},
				{
					name: `Channels (${guild.channels.cache.size})`,
					value: [
						`💬 **Text** ${count(TEXT_TYPES)}`,
						`🔊 **Voice** ${count(VOICE_TYPES)}`,
						`🧵 **Threads** ${count(THREAD_TYPES)}`,
						`📑 **Categories** ${count([ChannelType.GuildCategory])}`,
					].join("\n"),
					inline: true,
				},
				{
					name: `Emojis & stickers (${guild.emojis.cache.size + guild.stickers.cache.size})`,
					value: [
						`📺 **Animated** ${guild.emojis.cache.filter((emoji) => emoji.animated === true).size}`,
						`🗿 **Static** ${guild.emojis.cache.filter((emoji) => emoji.animated !== true).size}`,
						`🏷 **Stickers** ${guild.stickers.cache.size}`,
					].join("\n"),
					inline: true,
				},
				{
					name: "Features",
					value: truncate(guild.features.map((feature) => `- ${titleCase(feature)}`).join("\n") || "None", 1_000),
					inline: true,
				},
				{
					name: `Roles (${roles.size})`,
					value: truncate(roles.map((role) => role.toString()).join(" ") || "None", 1_000),
				},
			],
			footer: `${guild.name} • ${guild.id}`,
			...(guild.iconURL() !== null ? { thumbnail: guild.iconURL({ size: 1024 })! } : {}),
			...(guild.bannerURL() !== null ? { image: guild.bannerURL({ size: 1024 })! } : {}),
		});

		await reply(interaction, { embeds: [builder] });
	},
});

function localeName(locale: string): string {
	try {
		return new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale;
	} catch {
		return locale;
	}
}
