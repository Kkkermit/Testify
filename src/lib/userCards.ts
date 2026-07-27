import { type APIEmbedField, type EmbedBuilder, type GuildMember, type User } from "discord.js";
import { embed } from "@lib/embeds";
import { discordTime } from "@lib/format";

export function avatarEmbed(user: User): EmbedBuilder {
	const url = user.displayAvatarURL({ size: 1024 });
	return embed({ category: "info", title: `${user.username}'s avatar`, url, image: url });
}

export async function bannerEmbed(user: User): Promise<EmbedBuilder> {
	const fetched = await user.fetch(true);
	const url = fetched.bannerURL({ size: 1024 });

	if (url === null || url === undefined) {
		return embed({
			category: "info",
			title: `${user.username}'s banner`,
			description: "This user does not have a banner.",
		});
	}

	return embed({ category: "info", title: `${user.username}'s banner`, url, image: url });
}

export function userInfoEmbed(user: User, member: GuildMember | null): EmbedBuilder {
	const fields: APIEmbedField[] = [
		{ name: "Username", value: user.username, inline: true },
		{ name: "ID", value: user.id, inline: true },
		{ name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
		{ name: "Account created", value: discordTime(user.createdAt, "R"), inline: true },
	];

	if (member) {
		fields.push(
			{
				name: "Joined server",
				value: member.joinedAt ? discordTime(member.joinedAt, "R") : "Unknown",
				inline: true,
			},
			{ name: "Nickname", value: member.nickname ?? "None", inline: true },
			{
				name: "Highest role",
				value: member.roles.highest.name === "@everyone" ? "None" : member.roles.highest.toString(),
				inline: true,
			},
			{
				name: `Roles (${member.roles.cache.size - 1})`,
				value:
					member.roles.cache
						.filter((role) => role.name !== "@everyone")
						.sort((a, b) => b.position - a.position)
						.map((role) => role.toString())
						.slice(0, 20)
						.join(" ") || "None",
			},
			{
				name: "Boosting since",
				value: member.premiumSince ? discordTime(member.premiumSince, "R") : "Not boosting",
				inline: true,
			},
		);
	}

	return embed({
		category: "info",
		title: `${user.displayName}`,
		fields,
		thumbnail: user.displayAvatarURL({ size: 512 }),
		footer: `User ID: ${user.id}`,
	});
}
