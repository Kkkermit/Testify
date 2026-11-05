import { type Guild } from "discord.js";
import { DAY_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { listBirthdays } from "@database/repositories/birthdayRepository";
import { listSchedules, type StoredSchedule } from "@database/repositories/scheduledMessageRepository";
import { readBirthdaySettings } from "@lib/birthdays/birthdayActions.util";
import { daysUntil } from "@lib/birthdays/birthdays.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { listGiveaways } from "@lib/giveaways/giveawayActions.util";
import { nextAfter } from "@lib/scheduledMessages/scheduledMessages.util";
import { type GuildWeek, WEEK_LIMITS, type WeekEvent } from "@testify/shared";

/** The next seven days of what the bot will do in a server, read from what each feature already stores. */

/** Every time a post goes out between `now` and `to`; one already due is about to go, so it starts the list. */
export function scheduleTimes(schedule: Pick<StoredSchedule, "nextAt" | "repeat">, now: Date, to: Date): Date[] {
	const times: Date[] = [];
	let at: Date | null = schedule.nextAt < now ? nextAfter(schedule.nextAt, schedule.repeat, now) : schedule.nextAt;

	while (at !== null && at < to && times.length < WEEK_LIMITS.perSchedule) {
		times.push(at);
		at = nextAfter(at, schedule.repeat, at);
	}
	return times;
}

/** Midnight UTC on the day a birthday next comes round, if that is inside the window. */
export function birthdayAt(day: number, month: number, now: Date): Date | null {
	const wait = daysUntil(day, month, now);
	if (wait >= WEEK_LIMITS.days) return null;

	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + wait * DAY_MS);
}

export async function readWeek(client: TestifyClient, guild: Guild, now: Date = new Date()): Promise<GuildWeek> {
	const to = new Date(now.getTime() + WEEK_LIMITS.days * DAY_MS);
	const within = (at: Date): boolean => at >= now && at < to;

	const [schedules, lottery, giveaways, birthdaySettings, birthdays] = await Promise.all([
		listSchedules(guild.id),
		readLottery(guild.id),
		listGiveaways(client, guild.id),
		readBirthdaySettings(guild),
		listBirthdays(guild.id),
	]);

	const events: WeekEvent[] = [
		...schedules.flatMap((schedule) =>
			scheduleTimes(schedule, now, to).map<WeekEvent>((at) => ({
				kind: "scheduled",
				at: at.toISOString(),
				id: schedule.id,
				channelId: schedule.channelId,
				message: schedule.message,
				repeat: schedule.repeat,
			})),
		),
		...giveaways
			.filter((row) => !row.ended && within(new Date(row.endAt)))
			.map<WeekEvent>((row) => ({
				kind: "giveaway",
				at: row.endAt,
				messageId: row.messageId,
				channelId: row.channelId,
				prize: row.prize,
			})),
	];

	if (lottery.enabled && !lottery.frozen && lottery.nextDrawAt !== null && within(new Date(lottery.nextDrawAt))) {
		events.push({ kind: "lottery", at: lottery.nextDrawAt, prizePool: lottery.prizePool });
	}

	// Only while birthday posts are on: a birthday the server will not mark is not something the bot will do.
	if (birthdaySettings.enabled) {
		for (const entry of birthdays) {
			const at = birthdayAt(entry.day, entry.month, now);
			if (at === null) continue;
			events.push({
				kind: "birthday",
				at: at.toISOString(),
				userId: entry.userId,
				name: guild.members.cache.get(entry.userId)?.displayName ?? entry.username,
			});
		}
	}

	events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	return { from: now.toISOString(), to: to.toISOString(), events };
}
