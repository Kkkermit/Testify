import { DiscordAPIError, type Guild, RESTJSONErrorCodes } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	countSchedules,
	createSchedule,
	deleteSchedule,
	findSchedule,
	listSchedules,
	type ScheduleFields,
	type StoredSchedule,
	updateSchedule,
} from "@database/repositories/scheduledMessageRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { parseDuration } from "@lib/format/duration.util";
import { problemText } from "@lib/format/problemText.util";
import {
	problem,
	sanitiseText,
	SCHEDULE_LIMITS,
	scheduleContentBlocked,
	type ScheduledMessage,
	type ScheduledMessageList,
	scheduleTimeBlocked,
} from "@testify/shared";

/** Scheduling, changing and posting a server's messages: the one path the panel, the dashboard and the job take. */

const GONE = "That scheduled message has been deleted, or has already been posted.";

export function publicSchedule(guild: Guild, stored: StoredSchedule): ScheduledMessage {
	return {
		id: stored.id,
		channelId: stored.channelId,
		message: stored.message,
		repeat: stored.repeat,
		nextAt: stored.nextAt.toISOString(),
		canSend: canPostIn(guild, stored.channelId),
	};
}

export async function readSchedules(guild: Guild): Promise<ScheduledMessageList> {
	const stored = await listSchedules(guild.id);
	return { messages: stored.map((entry) => publicSchedule(guild, entry)), limit: SCHEDULE_LIMITS.maxPerGuild };
}

export async function readSchedule(guild: Guild, id: string): Promise<ScheduledMessage> {
	const stored = await findSchedule(guild.id, id);
	if (stored === null) throw new UserFacingError(GONE);
	return publicSchedule(guild, stored);
}

/** A length of time from now, as `/schedule` and the panel take it; the dashboard sends a date instead. */
export function postIn(input: string, now: Date = new Date()): Date {
	const delay = parseDuration(input);
	if (delay === null) throw new UserFacingError(problemText(problem("schedule.time")));
	return new Date(now.getTime() + delay);
}

/** Every rule a schedule's channel and words have to meet, whichever surface they came from. */
function checkedContent<Fields extends Pick<ScheduleFields, "channelId" | "message">>(
	guild: Guild,
	fields: Fields,
): Fields {
	const clean = { ...fields, message: sanitiseText(fields.message) };

	const blocked = scheduleContentBlocked(clean);
	if (blocked !== null) throw new UserFacingError(problemText(blocked));
	if (clean.message.length > SCHEDULE_LIMITS.maxMessage) {
		throw new UserFacingError(`Keep the message to ${String(SCHEDULE_LIMITS.maxMessage)} characters.`);
	}
	if (!canPostIn(guild, clean.channelId)) {
		throw new UserFacingError(`I cannot post in <#${clean.channelId}>. Give me Send Messages there, or pick another.`);
	}

	return clean;
}

function checkedTime(nextAt: Date, now: Date): Date {
	const blocked = scheduleTimeBlocked(nextAt, now);
	if (blocked !== null) throw new UserFacingError(problemText(blocked));
	return nextAt;
}

export async function addSchedule(
	guild: Guild,
	fields: ScheduleFields,
	updatedBy: string | null,
	now: Date = new Date(),
): Promise<ScheduledMessage> {
	if ((await countSchedules(guild.id)) >= SCHEDULE_LIMITS.maxPerGuild) {
		throw new UserFacingError(
			`A server can keep ${String(SCHEDULE_LIMITS.maxPerGuild)} scheduled messages. Delete one to add another.`,
		);
	}

	const clean = { ...checkedContent(guild, fields), nextAt: checkedTime(fields.nextAt, now) };
	return publicSchedule(guild, await createSchedule(guild.id, clean, updatedBy));
}

/** Only what changed is checked against the clock, so editing the words of a post due in 30 seconds still saves. */
export async function changeSchedule(
	guild: Guild,
	id: string,
	changes: Partial<ScheduleFields>,
	updatedBy: string | null,
	now: Date = new Date(),
): Promise<ScheduledMessage> {
	const current = await findSchedule(guild.id, id);
	if (current === null) throw new UserFacingError(GONE);

	const content = checkedContent(guild, {
		channelId: changes.channelId ?? current.channelId,
		message: changes.message ?? current.message,
	});
	const saved = await updateSchedule(
		guild.id,
		id,
		{
			...content,
			repeat: changes.repeat ?? current.repeat,
			...(changes.nextAt === undefined || changes.nextAt.getTime() === current.nextAt.getTime()
				? {}
				: { nextAt: checkedTime(changes.nextAt, now) }),
		},
		updatedBy,
	);
	if (saved === null) throw new UserFacingError(GONE);
	return publicSchedule(guild, saved);
}

export async function removeSchedule(guild: Guild, id: string): Promise<void> {
	if (!(await deleteSchedule(guild.id, id))) throw new UserFacingError(GONE);
}

/** Discord's answers that mean the channel will never take this post, as opposed to failing for now. */
const NEVER = new Set<number>([
	RESTJSONErrorCodes.UnknownChannel,
	RESTJSONErrorCodes.MissingAccess,
	RESTJSONErrorCodes.MissingPermissions,
]);

/** Posts it without pinging anybody; `unreachable` when the server or channel is gone or will not take it. */
export async function deliverSchedule(
	client: TestifyClient,
	schedule: StoredSchedule,
): Promise<"sent" | "unreachable"> {
	const guild = client.guilds.cache.get(schedule.guildId);
	const channel = await guild?.channels.fetch(schedule.channelId).catch(() => null);
	if (channel?.isSendable() !== true) return "unreachable";

	try {
		await channel.send({ content: schedule.message, allowedMentions: { parse: [] } });
		return "sent";
	} catch (error) {
		if (error instanceof DiscordAPIError && typeof error.code === "number" && NEVER.has(error.code)) {
			return "unreachable";
		}
		throw error;
	}
}
