import { type Guild, type MessageCreateOptions, type User } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	countBirthdays,
	findBirthday,
	forgetBirthday,
	getBirthdaySettings,
	listBirthdays,
	saveBirthdaySettings,
	shareBirthday,
	type StoredBirthday,
	type StoredBirthdaySettings,
} from "@database/repositories/birthdayRepository";
import { daysUntil } from "@lib/birthdays/birthdays.util";
import { canPostIn } from "@lib/discord/channels.util";
import {
	BIRTHDAY_LIMITS,
	type BirthdayOverview,
	type BirthdayPatch,
	type BirthdaySettings,
	DEFAULT_BIRTHDAY_MESSAGE,
	fillTemplate,
	isBirthday,
	type UpcomingBirthday,
} from "@testify/shared";

/** A server's birthday posts: its settings, the birthdays members shared with it, and the one post they all make. */

export async function readBirthdaySettings(guild: Guild): Promise<BirthdaySettings> {
	const stored = await getBirthdaySettings(guild.id);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		message: stored?.message ?? DEFAULT_BIRTHDAY_MESSAGE,
		canSend: channelId !== null && canPostIn(guild, channelId),
	};
}

/** Posts cannot be on with nowhere to go, so clearing the channel turns them off; a channel is checked as it is chosen. */
export async function applyBirthdaySettings(
	guild: Guild,
	patch: BirthdayPatch,
	updatedBy: string | null,
): Promise<BirthdaySettings> {
	const current = await readBirthdaySettings(guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;

	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for birthdays before turning them on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null && !canPostIn(guild, patch.channelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveBirthdaySettings(
		guild.id,
		{
			enabled: channelId === null ? false : (patch.enabled ?? current.enabled),
			channelId,
			message: patch.message ?? current.message,
		},
		updatedBy,
	);
	return readBirthdaySettings(guild);
}

/** Sharing in a server is the member's own say-so for that server, and nothing but the day and month is kept. */
export async function setOwnBirthday(guildId: string, user: User, day: number, month: number): Promise<StoredBirthday> {
	if (!isBirthday(day, month)) throw new UserFacingError("That is not a day in that month.");
	return shareBirthday(guildId, user.id, user.username, day, month);
}

export async function removeOwnBirthday(guildId: string, userId: string): Promise<void> {
	if (!(await forgetBirthday(guildId, userId))) {
		throw new UserFacingError("You have not shared your birthday with this server.");
	}
}

/** Somebody who leaves takes their birthday with them, since they shared it with a server they are no longer in. */
export async function forgetLeaver(guildId: string, userId: string): Promise<void> {
	await forgetBirthday(guildId, userId);
}

export async function ownBirthday(guildId: string, userId: string): Promise<StoredBirthday | null> {
	return findBirthday(guildId, userId);
}

/** Soonest first, named as the server knows them now, or as they were when they shared it. */
export async function upcomingBirthdays(
	guild: Guild,
	now: Date = new Date(),
	limit: number = BIRTHDAY_LIMITS.upcoming,
): Promise<UpcomingBirthday[]> {
	const shared = await listBirthdays(guild.id);

	return shared
		.map((entry) => ({ entry, wait: daysUntil(entry.day, entry.month, now) }))
		.sort((a, b) => a.wait - b.wait || a.entry.username.localeCompare(b.entry.username))
		.slice(0, limit)
		.map(({ entry }) => ({
			userId: entry.userId,
			name: guild.members.cache.get(entry.userId)?.displayName ?? entry.username,
			day: entry.day,
			month: entry.month,
		}));
}

export async function readBirthdayOverview(guild: Guild, now: Date = new Date()): Promise<BirthdayOverview> {
	const [settings, shared, upcoming] = await Promise.all([
		readBirthdaySettings(guild),
		countBirthdays(guild.id),
		upcomingBirthdays(guild, now),
	]);
	return { ...settings, shared, upcoming };
}

/** Pings the member it is for and nobody else, since the rest of the text is whatever a manager typed. */
export function birthdayPost(
	member: { id: string; username: string },
	guild: { name: string; memberCount: number },
	settings: Pick<StoredBirthdaySettings, "message">,
): MessageCreateOptions {
	return {
		content: fillTemplate(settings.message, {
			mention: `<@${member.id}>`,
			username: member.username,
			serverName: guild.name,
			memberCount: guild.memberCount,
		}),
		allowedMentions: { users: [member.id] },
	};
}

/** `gone` when the member has left, `unreachable` when the channel will not take it. */
export async function postBirthday(
	client: TestifyClient,
	birthday: StoredBirthday,
	settings: StoredBirthdaySettings,
): Promise<"sent" | "gone" | "unreachable"> {
	const guild = client.guilds.cache.get(birthday.guildId);
	if (guild === undefined || settings.channelId === null) return "unreachable";

	const member = await guild.members.fetch(birthday.userId).catch(() => null);
	if (member === null) return "gone";

	const channel = await guild.channels.fetch(settings.channelId).catch(() => null);
	if (channel?.isSendable() !== true) return "unreachable";

	await channel.send(birthdayPost({ id: member.id, username: member.user.username }, guild, settings));
	return "sent";
}
