import { type Guild, type GuildMember, type User } from "discord.js";
import { strings } from "@config/strings";
import { theme } from "@config/theme";
import { UserFacingError } from "@core/errors";
import { dmEmbed, notifyTarget } from "@lib/moderation/moderationActions.util";

/** Kicking and banning, shared by the commands and the dashboard so both check and notify the same way. */

export interface Sanctioned {
	notified: boolean;
}

/** The DM goes first, because once they are out of the server the bot can no longer reach them. */
export async function kickMember(
	guild: Guild,
	member: GuildMember,
	moderatorName: string,
	reason: string,
): Promise<Sanctioned> {
	if (!member.kickable) throw new UserFacingError(strings.moderation.notModeratable);

	const notified = await notifyTarget(
		member.user,
		dmEmbed({
			action: `kicked from ${guild.name}`,
			emoji: theme.emoji.moderation,
			guild,
			moderator: { username: moderatorName },
			reason,
		}),
	);

	await member.kick(`${moderatorName}: ${reason}`);

	return { notified };
}

/** Works on somebody who has already left, which is the one case a kick cannot cover. */
export async function banUser(
	guild: Guild,
	user: User,
	member: GuildMember | null,
	moderatorName: string,
	reason: string,
	deleteDays = 0,
): Promise<Sanctioned> {
	if (member !== null && !member.bannable) throw new UserFacingError(strings.moderation.notModeratable);

	const existing = await guild.bans.fetch(user.id).catch(() => null);
	if (existing !== null) throw new UserFacingError(`${user.username} is already banned.`);

	const notified =
		member === null
			? false
			: await notifyTarget(
					user,
					dmEmbed({
						action: `banned from ${guild.name}`,
						emoji: theme.emoji.moderation,
						guild,
						moderator: { username: moderatorName },
						reason,
					}),
				);

	await guild.members.ban(user.id, {
		reason: `${moderatorName}: ${reason}`,
		deleteMessageSeconds: deleteDays * 86_400,
	});

	return { notified };
}
