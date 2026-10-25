import { DAY_MS } from "@config/constants";
import { MONTHS } from "@testify/shared";

/** Which birthdays fall today and which come next, in UTC, as arithmetic every case of which is a test. */

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Today's date, and the 29th of February on the 28th of a year that has none. */
export function birthdaysOn(now: Date): { day: number; month: number }[] {
	const day = now.getUTCDate();
	const month = now.getUTCMonth() + 1;
	const dates = [{ day, month }];
	if (month === 2 && day === 28 && !isLeapYear(now.getUTCFullYear())) dates.push({ day: 29, month: 2 });
	return dates;
}

export function dayMonth(day: number, month: number): string {
	return `${String(day)} ${MONTHS[month - 1] ?? ""}`;
}

/** Whole days until the birthday next comes round, counting today as 0. */
export function daysUntil(day: number, month: number, now: Date): number {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

	for (const year of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
		const leapDay = month === 2 && day === 29 && !isLeapYear(year);
		const at = Date.UTC(year, month - 1, leapDay ? 28 : day);
		if (at >= today) return Math.round((at - today) / DAY_MS);
	}
	return 366;
}
