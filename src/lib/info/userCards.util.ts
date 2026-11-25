import { type APIEmbedField, type EmbedBuilder, type GuildMember, type User } from "discord.js";
import { embed } from "@lib/discord/embeds.util";
import { discordTime } from "@lib/format/format.util";

/** Discord caps a field at 1,024 characters, which twenty role mentions stay well inside. */
const ROLES_SHOWN = 20;

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

/** The day, and how long ago under it, so a date reads at a glance and exactly. */
function when(at: Date): string {
	return `${discordTime(at, "D")}\n-# ${discordTime(at, "R")}`;
}

export function userInfoEmbed(user: User, member: GuildMember | null): EmbedBuilder {
	const fields: APIEmbedField[] = [
		{ name: "Username", value: user.username, inline: true },
		{ name: "ID", value: `\`${user.id}\``, inline: true },
		{ name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
		{ name: "Account created", value: when(user.createdAt), inline: true },
	];

	if (member) {
		// The @everyone role shares the server's id, and every member holds it.
		const roles = member.roles.cache
			.filter((role) => role.id !== member.guild.id)
			.sort((a, b) => b.position - a.position)
			.map((role) => role.toString());
		const highest = member.roles.highest;

		fields.push(
			{ name: "Joined server", value: member.joinedAt ? when(member.joinedAt) : "Unknown", inline: true },
			{ name: "Nickname", value: member.nickname ?? "None", inline: true },
			{
				name: "Highest role",
				value: highest.id === member.guild.id ? "None" : highest.toString(),
				inline: true,
			},
			{
				name: `Roles (${String(roles.length)})`,
				value:
					roles.length === 0
						? "None"
						: `${roles.slice(0, ROLES_SHOWN).join(" ")}${roles.length > ROLES_SHOWN ? ` and ${String(roles.length - ROLES_SHOWN)} more` : ""}`,
			},
			{
				name: "Boosting since",
				value: member.premiumSince ? when(member.premiumSince) : "Not boosting",
				inline: true,
			},
		);
	}

	return embed({
		category: "info",
		title: user.displayName,
		fields,
		thumbnail: user.displayAvatarURL({ size: 512 }),
		footer: `User ID: ${user.id}`,
	});
}
