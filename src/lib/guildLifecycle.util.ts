import { type EmbedBuilder, type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";

/**
 * `guildCreate` and `guildDelete` shared roughly eighty percent of their code and
 * the delete handler still logged a `[GUILD_CREATE]` tag. Both now build the same
 * embed through one function.
 */
export async function buildGuildEmbed(
	client: TestifyClient,
	guild: Guild,
	kind: "joined" | "left",
): Promise<EmbedBuilder> {
	const owner = await guild.fetchOwner().catch(() => null);
	const inviteUrl = kind === "joined" ? await createInvite(guild) : null;

	const fields = [
		{ name: "Guild", value: `\`${guild.name}\` (${guild.id})` },
		{
			name: "Owner",
			value: owner ? `\`${owner.user.username}\` (${owner.id})` : `Unknown (${guild.ownerId})`,
		},
		{ name: "Members", value: formatNumber(guild.memberCount), inline: true },
		{ name: "Server count", value: formatNumber(client.guilds.cache.size), inline: true },
	];

	if (inviteUrl !== null) fields.push({ name: "Invite", value: inviteUrl });

	const builder = embed({
		colour: kind === "joined" ? "Green" : "Red",
		title: kind === "joined" ? "Joined a new server" : "Left a server",
		description:
			kind === "joined"
				? `**${guild.name}** invited ${client.user?.username ?? "the bot"} to their server.`
				: `${client.user?.username ?? "The bot"} is no longer in **${guild.name}**.`,
		fields,
		footer: `${client.guilds.cache.size} servers`,
	});

	const icon = guild.iconURL();
	if (icon !== null) builder.setThumbnail(icon);
	return builder;
}

async function createInvite(guild: Guild): Promise<string | null> {
	const channel = guild.channels.cache.find(
		(candidate) =>
			candidate.isTextBased() &&
			guild.members.me !== null &&
			candidate.permissionsFor(guild.members.me).has("CreateInstantInvite"),
	);
	if (!channel) return null;

	try {
		const invite = await guild.invites.create(channel.id, { maxAge: 0, maxUses: 0 });
		return invite.url;
	} catch {
		return null;
	}
}

export async function announceGuildChange(client: TestifyClient, guild: Guild, kind: "joined" | "left"): Promise<void> {
	const channelId = client.env.CHANNEL_GUILD_LOG;

	client.logger.info(
		{ guildId: guild.id, guildName: guild.name, members: guild.memberCount, total: client.guilds.cache.size },
		kind === "joined" ? "Added to a guild" : "Removed from a guild",
	);

	if (channelId === undefined) return;

	try {
		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || !channel.isSendable()) return;
		await channel.send({ embeds: [await buildGuildEmbed(client, guild, kind)] });
	} catch (error) {
		client.logger.warn({ err: toError(error) }, "Could not announce the guild change");
	}
}
