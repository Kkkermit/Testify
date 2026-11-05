import { type ChannelSummary, type GuildWeek, type WeekEvent } from "@testify/shared";
import { type TFunction } from "i18next";
import { channelLabel } from "@/lib/channels";
import { weekdayDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

export interface WeekDay {
	key: string;
	heading: string;
	events: WeekEvent[];
}

/** The reader's own calendar day, so an event at 23:30 is not put under the next day by UTC. */
function localDay(at: Date): string {
	return `${String(at.getFullYear())}-${String(at.getMonth() + 1)}-${String(at.getDate())}`;
}

export function groupByDay(events: readonly WeekEvent[], t: TFunction, now: Date = new Date()): WeekDay[] {
	const today = localDay(now);
	const tomorrow = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
	const days = new Map<string, WeekDay>();

	for (const event of events) {
		const key = localDay(new Date(event.at));
		const heading = key === today ? t("week.today") : key === tomorrow ? t("week.tomorrow") : weekdayDate(event.at);
		const day = days.get(key) ?? { key, heading, events: [] };
		day.events.push(event);
		days.set(key, day);
	}
	return [...days.values()];
}

export function weekSummary(week: GuildWeek, t: TFunction): string {
	return week.events.length === 0 ? t("week.summaryNone") : t("week.summary", { count: week.events.length });
}

export function eventTitle(event: WeekEvent, channels: readonly ChannelSummary[], t: TFunction): string {
	switch (event.kind) {
		case "scheduled":
			return t("week.scheduled", { channel: channelLabel(channels, event.channelId, t) });
		case "lottery":
			return t("week.lottery");
		case "giveaway":
			return t("week.giveaway", { prize: event.prize });
		case "birthday":
			return t("week.birthday", { name: event.name });
	}
}

export function eventDetail(event: WeekEvent, channels: readonly ChannelSummary[], t: TFunction): string | undefined {
	switch (event.kind) {
		case "scheduled":
			return event.message.split("\n")[0];
		case "lottery":
			return t("week.lotteryPot", { pot: formatNumber(event.prizePool) });
		case "giveaway":
			return channelLabel(channels, event.channelId, t, "title");
		case "birthday":
			return undefined;
	}
}

export const EVENT_PATHS: Record<WeekEvent["kind"], string> = {
	scheduled: "/scheduled-messages",
	lottery: "/lottery",
	giveaway: "/giveaways",
	birthday: "/birthdays",
};
