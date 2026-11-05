import { type LotteryFrequency } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const FREQUENCY_LABELS: Record<LotteryFrequency, TranslationKey> = {
	hourly: "lottery.everyHour",
	daily: "lottery.everyDay",
	weekly: "lottery.everyWeek",
};

export const RESCHEDULE_NOTES: Record<LotteryFrequency, TranslationKey> = {
	hourly: "lottery.reschedulesHourly",
	daily: "lottery.reschedulesDaily",
	weekly: "lottery.reschedulesWeekly",
};
